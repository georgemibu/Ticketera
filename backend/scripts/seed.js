import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import knex from 'knex';

dotenv.config();

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});

async function seed() {
  try {
    console.log('Seeding demo event and user...');

    // Crear evento demo
    const eventId = uuidv4();
    const existingEvent = await db('events').where({ title: 'Evento Demo' }).first();
    if (!existingEvent) {
      await db('events').insert({
        id: eventId,
        title: 'Evento Demo',
        description: 'Evento de demostración para pruebas',
        date: new Date().toISOString(),
        price_ars: 1500,
      });
      console.log('Evento creado:', eventId);
    } else {
      console.log('Evento ya existe:', existingEvent.id);
    }

    // Crear usuario demo
    const userEmail = 'demo@local.test';
    const existingUser = await db('users').where({ email: userEmail }).first();
    if (!existingUser) {
      const userId = uuidv4();
      await db('users').insert({ id: userId, email: userEmail });
      console.log('Usuario creado:', userId, userEmail);
    } else {
      console.log('Usuario ya existe:', existingUser.id, existingUser.email);
    }

    console.log('Seed terminado.');
    process.exit(0);
  } catch (err) {
    console.error('Error during seed:', err);
    process.exit(1);
  }
}

seed();
