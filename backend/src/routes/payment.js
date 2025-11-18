import express from "express";
import Stripe from "stripe";
import knex from "../db/knexClient.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Crear sesión de pago
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { email, quantity } = req.body;

    // 1. Crear orden "pending"
    const [orderId] = await knex("orders")
      .insert({
        email,
        quantity,
        status: "pending",
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      })
      .returning("id");

    // 2. Crear Checkout Session de Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: `${process.env.BASE_URL}/success`,
      cancel_url: `${process.env.BASE_URL}/cancel`,
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Entrada al evento",
            },
            unit_amount: 1000, // = $10.00
          },
          quantity,
        },
      ],
      metadata: {
        order_id: orderId.id, // <-- IMPORTANTE
      },
    });

    // 3. Guardar session.id en la orden
    await knex("orders")
      .where({ id: orderId.id })
      .update({
        stripe_session_id: session.id,
      });

    // 4. Enviar URL al frontend
    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creando sesión de pago:", error);
    res.status(500).json({ error: "Error creando sesión de pago" });
  }
});

export default router;
