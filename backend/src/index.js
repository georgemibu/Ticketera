import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import paymentRoutes from "./routes/payment.js";
import webhookRoutes from "./routes/webhook.js";
import checkoutRouter from "./routes/checkout.js";
import validateRouter from "./routes/validate.js";
import ordersRouter from "./routes/orders.js";



const app = express();

// Middlewares
app.use(
  "/api/webhook/stripe",
  express.raw({ type: "application/json" })
);
app.use(cors());
app.use(express.json());
app.use("/api/payment", paymentRoutes);
app.use("/api/webhook", webhookRoutes);
app.use("/api/validate", validateRouter);
app.use("/api/orders", ordersRouter);
app.use("/checkout", checkoutRouter);

// Rutas base de prueba (luego agregamos las reales)
app.get("/", (req, res) => {
  res.send("Servidor funcionando correctamente ✔");
});

// Levantar servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
