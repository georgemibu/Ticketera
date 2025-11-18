import express from "express";
import db from "../db/knexClient.js";

const router = express.Router();

// GET /api/orders/by-session/:sessionId
router.get("/by-session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    // 1. Buscar la orden por el session_id de Stripe
    const order = await db("orders")
      .where({ stripe_session_id: sessionId })
      .first();

    if (!order) {
      return res.status(404).json({ error: "Orden no encontrada" });
    }

    // 2. Si la orden no está pagada, no podemos mostrar tickets
    if (order.status !== "paid") {
      return res.status(402).json({ error: "La orden no ha sido pagada" });
    }

    // 3. Buscar los tickets asociados a la orden
    const tickets = await db("tickets").where({ order_id: order.id });

    if (!tickets || tickets.length === 0) {
      // Esto puede pasar si el webhook todavía se está procesando
      return res.status(202).json({ message: "Tickets en procesamiento. Intenta de nuevo en unos segundos." });
    }

    // 4. Devolver los tickets (que incluyen la URL del QR)
    res.json({
      email: order.email,
      tickets,
    });

  } catch (err) {
    console.error("Error en /orders/by-session/:sessionId:", err);
    res.status(500).json({ error: "Algo salió mal" });
  }
});

export default router;
