#!/usr/bin/env node
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import fs from 'fs';

dotenv.config({ path: './.env' });

const JWT_SECRET = process.env.JWT_SECRET || 'simulated_jwt_secret';

async function simulate() {
  console.log('--- Simulación de pago (entorno aislado) ---');

  // Crear orden simulado
  const orderId = uuidv4();
  const email = 'test@example.com';
  const quantity = 3; // generar 3 tickets

  console.log(`Orden creada: id=${orderId}, email=${email}, quantity=${quantity}`);

  // Simular webhook de pago aprobado: generar tickets
  const tickets = [];
  for (let i = 0; i < quantity; i++) {
    const ticket_code = uuidv4();
    const payload = { ticket_code, order_id: orderId };
    const qr_jwt = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
    const qr_url = await QRCode.toDataURL(qr_jwt);

    tickets.push({ id: uuidv4(), ticket_code, qr_jwt, qr_url });
  }

  console.log('\n--- Tickets generados ---');
  tickets.forEach((t, idx) => {
    console.log(`Ticket #${idx + 1}`);
    console.log(`  id: ${t.id}`);
    console.log(`  ticket_code: ${t.ticket_code}`);
    console.log(`  qr_jwt (first 80 chars): ${t.qr_jwt.slice(0,80)}...`);
    console.log(`  qr_url (dataURL prefix): ${t.qr_url.slice(0,80)}...`);
  });

  console.log('\nPuedes usar los `qr_jwt` en el endpoint /api/validate para probar la validación.');
  console.log('Si querés, guardo el resultado en backend/tmp/simulated-tickets.json');

  // Guardar archivo
  try {
    const outDir = './backend/tmp';
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(`${outDir}/simulated-tickets.json`, JSON.stringify({ orderId, email, tickets }, null, 2));
    console.log(`Guardado: ${outDir}/simulated-tickets.json`);
  } catch (e) {
    console.error('No se pudo guardar archivo:', e.message);
  }
}

simulate().catch((e) => {
  console.error('Error en simulación:', e);
  process.exit(1);
});
