import express from "express";
import jwt from "jsonwebtoken";
import db from "../db/knexClient.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { qrJwt } = req.body;

  if (!qrJwt) {
    return res.status(400).json({ valid: false, reason: "missing_token" });
  }

  try {
    // 1. Verificar el JWT
    const payload = jwt.verify(qrJwt, process.env.JWT_SECRET);
    const { ticket_code } = payload;

    if (!ticket_code) {
      throw new Error("Invalid token payload");
    }

    // 2. Usar una transacción para chequear y actualizar el ticket
    const result = await db.transaction(async (trx) => {
      const ticket = await trx("tickets")
        .where({ ticket_code })
        .first();

      if (!ticket) {
        return { valid: false, reason: "not_found" };
      }

      if (ticket.used) {
        return {
          valid: false,
          reason: "already_used",
          used_at: ticket.used_at,
        };
      }

      // 3. Marcar el ticket como usado
      const [updatedTicket] = await trx("tickets")
        .where({ id: ticket.id })
        .update({
          used: true,
          used_at: db.fn.now(),
        })
        .returning(["id", "used_at"]);

      return {
        valid: true,
        ticket: {
          id: updatedTicket.id,
          used_at: updatedTicket.used_at,
        },
      };
    });

    return res.status(200).json(result);

  } catch (e) {
    // Manejar errores de JWT (expirado, malformado, etc.)
    if (e instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({ valid: false, reason: "invalid_token" });
    }
    // Otros errores
    console.error("Error en /validate:", e);
    return res.status(500).json({ valid: false, reason: "server_error" });
  }
});

export default router;
