import express from "express";
import Stripe from "stripe";
import fetch from 'node-fetch';
import knex from "../db/knexClient.js";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";

const router = express.Router();

// --- CONFIGURACIONES ---
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

// --- LÓGICA COMPARTIDA ---

/**
 * Marca una orden como pagada y crea los tickets correspondientes.
 * Se usa dentro de una transacción de Knex.
 * @param {object} trx - La transacción de Knex.
 * @param {string} orderId - El UUID de la orden a procesar.
 */
const processPaidOrder = async (trx, orderId) => {
  // 1. Actualizamos order a pagado
  const [order] = await trx("orders")
    .where({ id: orderId, status: "pending" })
    .update({
      status: "paid",
      updated_at: knex.fn.now(),
    })
    .returning("*");

  if (!order) {
    console.log(`ℹ Orden ${orderId} no encontrada o ya procesada.`);
    return;
  }

  console.log(`✔ Orden ${order.id} marcada como pagada.`);

  // 2. Creamos los tickets asociados
  const ticketsToInsert = [];
  for (let i = 0; i < order.quantity; i++) {
    const ticket_code = uuidv4();
    const payload = { ticket_code, order_id: order.id };
    const qr_jwt = jwt.sign(payload, process.env.JWT_SECRET);
    const qr_url = await QRCode.toDataURL(qr_jwt);

    ticketsToInsert.push({
      order_id: order.id,
      ticket_code,
      qr_url,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    });
  }

  if (ticketsToInsert.length > 0) {
    await trx("tickets").insert(ticketsToInsert);
    console.log(`🎟 Tickets creados para la orden ${order.id}:`, ticketsToInsert.length);
  }
};


// --- WEBHOOKS ---

// Webhook para Stripe
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("⚠ Error verificando webhook de Stripe:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.log("✅ Pago de Stripe confirmado para session:", session.id);

      try {
        // Buscamos la orden por el ID de sesión de Stripe
        const order = await knex("orders").where({ payment_session_id: session.id }).first();
        if (order) {
          await knex.transaction(async (trx) => {
            await processPaidOrder(trx, order.id);
          });
        } else {
          console.error(`No se encontró la orden para la sesión de Stripe ${session.id}`);
        }
      } catch (error) {
        console.error("❌ Error procesando el webhook de Stripe:", error);
        return res.status(500).json({ error: "Error al procesar el pago." });
      }
    }

    res.status(200).send("Webhook de Stripe recibido");
  }
);

// Webhook para Mercado Pago
router.post("/mercadopago", async (req, res) => {
  const { body } = req;

  // Aseguramos responder rápido para tipos que no manejamos
  if (!body || body.type !== "payment") {
    return res.status(200).send("Evento ignorado");
  }

  const paymentId = body.data && body.data.id;
  if (!paymentId) {
    console.warn('Notificación de MP sin payment id:', body);
    return res.status(400).json({ error: 'No payment id in notification' });
  }

  console.log("🔔 Notificación de Mercado Pago recibida para pago:", paymentId);

  try {
    // Consultamos directamente la API de MP para obtener el estado real del pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
    });

    if (!mpRes.ok) {
      const text = await mpRes.text();
      console.error('Error consultando MP payments API:', mpRes.status, text);
      return res.status(500).json({ error: 'Error consultando Mercado Pago' });
    }

    const payment = await mpRes.json();

    // Obtener external_reference que usamos como orderId
    const externalRef = payment.external_reference;
    if (!externalRef) {
      console.warn('Pago MP sin external_reference:', payment);
      return res.status(200).send('No external_reference');
    }

    // Buscar la orden asociada
    const order = await knex('orders').where({ id: externalRef }).first();
    if (!order) {
      console.warn(`No se encontró orden para external_reference=${externalRef}`);
      return res.status(200).send('Orden no encontrada');
    }

    // Validación de monto (si existe amount_cents en la orden)
    const paidAmountCents = Math.round((payment.transaction_amount || payment.transaction_amount_refunded || 0) * 100);
    if (order.amount_cents && paidAmountCents !== Number(order.amount_cents)) {
      console.warn(`Monto pagado no coincide. Orden: ${order.amount_cents}c, MP: ${paidAmountCents}c`);
      // No procesamos la orden automáticamente si el monto no coincide
      return res.status(200).send('Monto no coincide');
    }

    if (payment.status === 'approved' || payment.status === 'paid' || payment.status_detail === 'accredited') {
      // Idempotencia: processPaidOrder actualiza solo si status = 'pending'
      await knex.transaction(async (trx) => {
        await processPaidOrder(trx, order.id);
      });
      return res.status(200).send('Orden procesada');
    } else {
      console.log(`Pago MP ${paymentId} recibido con estado ${payment.status}. No se procesará.`);
      return res.status(200).send('Pago no aprobado');
    }
  } catch (error) {
    console.error('❌ Error procesando el webhook de Mercado Pago:', error);
    return res.status(500).json({ error: 'Error al procesar la notificación.' });
  }
});

export default router;
