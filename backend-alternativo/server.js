import express from 'express';
import cors from 'cors';
import { Vexor } from 'vexor';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' }); // Now this will load your .env file

console.log("VEXOR_API_KEY:", process.env.VEXOR_API_KEY);

const vexorInstance = new Vexor({
  publishableKey: process.env.VEXOR_PUBLISHABLE_KEY,
  projectId: process.env.VEXOR_PROJECT_ID,
  apiKey: process.env.VEXOR_API_KEY,
});

console.log("VEXOR_API_KEY:", process.env.VEXOR_API_KEY);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.post('/create-payment', async (req, res) => {
    const { product } = req.body;

    if (!product || !product.title || !product.unit_price || !product.quantity) {
        return res.status(400).json({ error: 'Invalid product data' });
    }

    try {
        const paymentResponse = await vexorInstance.pay.mercadopago ({
            items: [
                {
                    title: product.title,
                    unit_price: product.unit_price,
                    quantity: product.quantity,
                },
            ],
        });

    res.status(200).json({ paymentUrl: paymentResponse.payment_url });
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({ error: 'Error creating payment' });
    }
});


//iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});