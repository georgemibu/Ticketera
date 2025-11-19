# Mercado Pago integration - notes and local testing

This file documents how to configure and test Mercado Pago integration locally.

1) Add env variables

Create `backend/.env` from `.env.example` and fill your sandbox credentials:

```
MERCADOPAGO_ACCESS_TOKEN=TEST-XXXXXXXXXXXX
API_URL=http://<public-or-ngrok-url>
BASE_URL=http://localhost:5173
JWT_SECRET=una_clave_super_segura
DATABASE_URL=postgres://user:pass@localhost:5432/tickets
```

2) Run migrations (if using knex)

Adjust according to your setup. Example:

```
cd backend
npx knex migrate:latest
```

3) Start backend

```
cd backend
npm install
npm run dev
```

4) Expose your server for webhooks with ngrok (recommended for local testing)

Install ngrok and run:

```
ngrok http 4000
```

Then set `API_URL` to the forwarded URL that ngrok prints (e.g. `https://xxxx.ngrok.io`).

5) Create a checkout from frontend using `paymentMethod: 'mercadopago'`.

6) Complete a sandbox payment on Mercado Pago and observe webhook logs. The webhook endpoint is:

```
POST <API_URL>/api/webhook/mercadopago
```

7) Troubleshooting
- If you don't receive webhook calls, confirm `API_URL` is the publicly reachable URL used in the preference `notification_url`.
- Check backend logs for errors when processing payment notifications.
