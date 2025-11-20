import express from "express";
import Stripe from "stripe";
import db from "../db/knexClient.js";
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";

const router = express.Router();

// --- CONFIGURACIONES ---
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const TICKET_PRICE_ARS = 1000;

// POST /checkout
router.post("/", async (req, res) => {
  try {
    const { email, quantity, paymentMethod = "stripe", eventId } = req.body;

    if (!email || !quantity) {
      return res.status(400).json({ error: "Email y quantity son requeridos" });
    }

    let checkoutUrl;
    let sessionId;
    const orderId = uuidv4(); // Usamos un ID nuestro para la external_reference

    // Encontrar o crear user
    let user = await db('users').where({ email }).first();
    if (!user) {
      const newUserId = uuidv4();
      const [newUser] = await db('users').insert({ id: newUserId, email }).returning('*');
      user = newUser;
    }

    if (paymentMethod === "mercadopago") {
      // --- LÓGICA DE MERCADO PAGO (usando API HTTP directa) ---
      const baseUrl = process.env.BASE_URL || "http://localhost:5173";
      
      const preferenceBody = {
        items: [
          {
            id: "entrada-evento",
            title: "Entrada al evento",
            quantity: quantity,
            unit_price: TICKET_PRICE_ARS,
            currency_id: "ARS",
          },
        ],
        payer: {
          email: email,
        },
        back_urls: {
          success: `${baseUrl}/success`,
          failure: `${baseUrl}/cancel`,
          pending: `${baseUrl}/pending`,
        },
        notification_url: `${process.env.API_URL || baseUrl}/api/webhook/mercadopago`,
        external_reference: orderId,
      };

      console.log("Mercado Pago preference body:", preferenceBody);

      // Call Mercado Pago API directly instead of using SDK
      try {
        const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
          },
          body: JSON.stringify(preferenceBody),
        });

        if (!mpResponse.ok) {
          const errorText = await mpResponse.text();
          console.error(`Mercado Pago API error (${mpResponse.status}):`, errorText);
          return res.status(502).json({ error: `Mercado Pago error: ${mpResponse.status} - ${errorText}` });
        }

        const result = await mpResponse.json();
        console.log("Mercado Pago preference response:", result);

        checkoutUrl = result.init_point;
        sessionId = result.id;

        if (!checkoutUrl || !sessionId) {
          console.warn('No init_point or id in Mercado Pago response:', result);
          return res.status(502).json({ error: 'Invalid Mercado Pago response' });
        }
      } catch (mpErr) {
        console.error("Mercado Pago fetch error:", mpErr);
        return res.status(502).json({ error: "Error connecting to Mercado Pago" });
      }

    } else {
      // --- LÓGICA DE STRIPE (DEFAULT) ---
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: "ars",
              product_data: {
                name: "Entrada al evento",
              },
              unit_amount: TICKET_PRICE_ARS * 100,
            },
            quantity,
          },
        ],
        success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BASE_URL}/cancel`,
      });
      
      checkoutUrl = session.url;
      sessionId = session.id;
    }

    // 2. Guardar orden en la base de datos
    // Guardamos event_id y user_id si están disponibles
    const amount_cents = TICKET_PRICE_ARS * 100 * Number(quantity || 1);
    const orderInsert = {
      id: orderId, // Usamos nuestro propio UUID
      payment_session_id: sessionId,
      payment_provider: paymentMethod,
      email,
      quantity,
      status: "pending",
      amount_cents,
    };
    if (eventId) orderInsert.event_id = eventId;
    if (user && user.id) orderInsert.user_id = user.id;

    const [order] = await db("orders")
      .insert(orderInsert)
      .returning("*");

    console.log("ORDEN CREADA:", order);

    // 3. Devolver url de checkout
    res.json({ checkoutUrl });

  } catch (err) {
    console.error("Error en /checkout:", err);
    res.status(500).json({ error: "Algo salió mal" });
  }
});

export default router;
