export function up(knex) {
  return knex.schema
    .createTable("orders", (table) => {
      table.uuid("id").primary();
      table.string("payment_session_id").notNullable();
      table.string("payment_provider").notNullable();
      table.string("email").notNullable();
      table.integer("quantity").notNullable();
      table.string("status").defaultTo("pending");
      table.timestamps(true, true);
    })
    .createTable("tickets", (table) => {
      table.increments("id").primary();
      table.uuid("order_id").references("id").inTable("orders").onDelete("CASCADE");
      table.string("ticket_code").unique().notNullable();
      table.string("qr_url").notNullable();
      table.boolean("used").defaultTo(false);
      table.timestamp("used_at").nullable();
      table.timestamps(true, true);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists("tickets")
    .dropTableIfExists("orders");
}
