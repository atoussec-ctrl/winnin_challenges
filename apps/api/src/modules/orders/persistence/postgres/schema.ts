import type { Pool } from "pg";

// Schema de pedidos (adaptado do sugerido em docs/BACKEND.md). Diferencas
// conscientes: ids sao `text` (UUID gerado na aplicacao, como ja era no modelo
// in-memory `user-1`/`order-1`) em vez de SERIAL, e valores monetarios sao
// `bigint` de centavos (o dominio usa inteiros para evitar erro de ponto
// flutuante). Idempotente para poder rodar no boot sem migracao externa.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_cents bigint NOT NULL,
  stock integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users (id),
  total_cents bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id bigserial PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders (id),
  product_id text NOT NULL REFERENCES products (id),
  quantity integer NOT NULL,
  unit_price_cents bigint NOT NULL,
  subtotal_cents bigint NOT NULL
);
`;

export async function ensureSchema(pool: Pool): Promise<void> {
  await pool.query(SCHEMA_SQL);
}
