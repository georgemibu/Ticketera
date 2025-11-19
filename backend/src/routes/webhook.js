import express from "express";
import Stripe from "stripe";
import { MercadoPagoConfig, Payment } from "mercadopago";
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

  if (body.type === "payment") {
    const paymentId = body.data.id;
    console.log("🔔 Notificación de Mercado Pago recibida para pago:", paymentId);

    try {
      const raw = await new Payment(mpClient).get({ id: paymentId });
      // SDKs sometimes nest the actual payment object in .body or .response
      const payment = raw || raw?.body || raw?.response || {};

      if (payment.status === "approved" && payment.external_reference) {
        console.log("✅ Pago de Mercado Pago aprobado para orden:", payment.external_reference);
        await knex.transaction(async (trx) => {
          await processPaidOrder(trx, payment.external_reference);
        });
      } else {
        console.log(`ℹ️ Pago de MP ${paymentId} no aprobado aún (estado: ${payment.status}). Full response:`, raw);
      }
    } catch (error) {
      console.error("❌ Error procesando el webhook de Mercado Pago:", error);
      return res.status(500).json({ error: "Error al procesar la notificación." });
    }
  }

  res.status(200).send("Webhook de Mercado Pago recibido");
});

export default router;
