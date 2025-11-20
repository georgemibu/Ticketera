# Mercado Pago Integration - Setup and Testing Guide

This document describes how to set up and test Mercado Pago integration locally using ngrok for webhook notifications.

## Quick Start

### 1. Prepare Environment Variables

Copy `.env.example` to `backend/.env` and fill in:

```bash
cd backend
copy .env.example .env
# Edit .env with:
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxx  # Your sandbox token
API_URL=https://your-ngrok-url.ngrok-free.app  # Will get this from ngrok
BASE_URL=http://localhost:5173
DATABASE_URL=postgres://user:pass@localhost:5432/tickets
JWT_SECRET=your-secure-key
```

### 2. Set Up Database

Run migrations:

```bash
npx knex migrate:latest --knexfile knexfile.js
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Backend

```bash
npm run dev
```

Backend will start on `http://localhost:4000`.

### 5. Expose Backend with ngrok

Open another terminal and run:

```bash
ngrok http 4000
```

Copy the HTTPS URL (e.g., `https://abcd-1234.ngrok-free.app`) and update `backend/.env`:

```
API_URL=https://abcd-1234.ngrok-free.app
```

Restart backend: `Ctrl+C` then `npm run dev`.

### 6. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

### 7. Test Checkout

- Fill email and quantity on the event page.
- Click "Pagar con Mercado Pago".
- You will be redirected to Mercado Pago sandbox.
- Complete payment using test card: `4111 1111 1111 1111` (any future expiry date).
- After approval, Mercado Pago sends a webhook to `https://your-ngrok-url/api/webhook/mercadopago`.

### 8. Verify Results

Check the backend logs for webhook processing. You should see:
- `🔔 Notificación de Mercado Pago recibida para pago: <payment_id>`
- `✅ Pago de Mercado Pago aprobado para orden: <order_id>`
- `✔ Orden <order_id> marcada como pagada.`
- `🎟 Tickets creados para la orden <order_id>: <quantity>`

Query the database to verify:

```sql
SELECT id, email, status, payment_provider, payment_session_id, created_at
FROM orders ORDER BY created_at DESC LIMIT 5;

SELECT id, order_id, ticket_code, used, created_at
FROM tickets WHERE order_id = '<order_id>';
```

## Troubleshooting

### Mercado Pago API Error (403)

- Check that `MERCADOPAGO_ACCESS_TOKEN` is valid and sandbox-enabled.
- Verify `API_URL` points to your public ngrok URL (not localhost).

### Webhook Not Received

- Confirm `API_URL` is set in `backend/.env` and matches the ngrok URL.
- Check ngrok dashboard: `http://127.0.0.1:4040`.
- Verify the webhook endpoint responds with HTTP 200.

### QR URL Too Long Error

- This has been fixed in the latest migration (`20251119_increase_qr_url_length.js`).
- `qr_url` column is now `text` type instead of `varchar(255)`.

### Backend Won't Start

- Ensure `DATABASE_URL` is correct and Postgres is running.
- Check `.env` file syntax (no extra spaces around `=`).

## Key Files Changed

- `backend/.env.example` - Template for environment variables.
- `backend/src/routes/checkout.js` - Uses HTTP API instead of SDK to avoid policy issues.
- `backend/src/routes/webhook.js` - Handles Mercado Pago notifications and creates tickets.
- `backend/migrations/20251119_increase_qr_url_length.js` - Fixes QR URL column size.

## Notes

- QR codes are generated as dataURLs (PNG base64) and stored in the database.
- Each ticket has a unique JWT that encodes the `ticket_code`.
- Tickets are marked as "used" after validation through `/api/validate` endpoint.
- Webhooks use transaction safety to ensure data consistency.

## Production Considerations

1. Use environment-specific credentials (sandbox for dev, production for prod).
2. Implement rate limiting on sensitive endpoints.
3. Add audit logging for ticket validations.
4. Use HTTPS everywhere (ngrok is only for local testing).
5. Implement proper error handling and monitoring.
6. Test webhook signature verification if using production MP webhooks.
