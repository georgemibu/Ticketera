import express from "express";
import Stripe from "stripe";
import knex from "../db/knex.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Crear sesión de pago
router.post("/create-checkout-session", async (req, res) => {
  try {
    const { quantity, email } = req.body;

    if (!quantity || !email) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    // Crear sesión de Stripe
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
              name: "Entrada al Evento",
            },
            unit_amount: 1000, // 10 USD por ticket
          },
          quantity,
        },
      ],
    });

    // Guardar la orden en la base de datos
    await knex("orders").insert({
      stripe_session_id: session.id,
      email,
      quantity,
      status: "pending",
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creando sesión:", error);
    res.status(500).json({ error: "Error al crear sesión de pago" });
  }
});

export default router;
