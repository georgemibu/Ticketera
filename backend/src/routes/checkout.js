import express from "express";
import Stripe from "stripe";
import { MercadoPagoConfig, Preference } from "mercadopago";
import db from "../db/knexClient.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// --- CONFIGURACIONES ---
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

const TICKET_PRICE_ARS = 1000;

// POST /checkout
router.post("/", async (req, res) => {
  try {
    const { email, quantity, paymentMethod = "stripe" } = req.body;

    if (!email || !quantity) {
      return res.status(400).json({ error: "Email y quantity son requeridos" });
    }

    let checkoutUrl;
    let sessionId;
    const orderId = uuidv4(); // Usamos un ID nuestro para la external_reference

    if (paymentMethod === "mercadopago") {
      // --- LÓGICA DE MERCADO PAGO ---
      const preference = new Preference(mpClient);

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
          success: `${process.env.BASE_URL}/success`,
          failure: `${process.env.BASE_URL}/cancel`,
          pending: `${process.env.BASE_URL}/pending`,
        },
        auto_return: "approved",
        notification_url: `${process.env.API_URL}/api/webhook/mercadopago`,
        external_reference: orderId,
      };

      console.log("Mercado Pago preference body:", preferenceBody);

      const result = await preference.create({
        body: preferenceBody,
      });

      checkoutUrl = result.init_point;
      sessionId = result.id; // ID de la preferencia de MP

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
    // Nota: La columna 'stripe_session_id' ahora guardará el ID de sesión de cualquier proveedor.
    const [order] = await db("orders")
      .insert({
        id: orderId, // Usamos nuestro propio UUID
        payment_session_id: sessionId,
        payment_provider: paymentMethod,
        email,
        quantity,
        status: "pending",
      })
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
