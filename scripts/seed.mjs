// Popula a API de pedidos com dados de demonstracao via GraphQL.
// A API guarda tudo em memoria, entao os dados somem a cada restart do
// container/servidor - rode este script de novo sempre que precisar.
//
// Uso: node scripts/seed.mjs [baseUrl]
// Default: http://localhost:3333

const baseUrl = process.argv[2] ?? process.env.API_URL ?? "http://localhost:3333";
const endpoint = `${baseUrl.replace(/\/$/, "")}/graphql`;

async function graphql(query, variables) {
  const response = await fetch(endpoint, {
    body: JSON.stringify({ query, variables }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}.`);
  }

  const payload = await response.json();

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }

  return payload.data;
}

const USERS = [
  { email: "ana.souza@example.com", name: "Ana Souza" },
  { email: "bruno.lima@example.com", name: "Bruno Lima" },
  { email: "carla.nunes@example.com", name: "Carla Nunes" },
  { email: "julia.melo@example.com", name: "Julia Melo" }
];

const PRODUCTS = [
  { name: "Teclado mecanico", price: 349.9, stock: 12 },
  { name: "Mouse sem fio", price: 129.9, stock: 4 },
  { name: 'Monitor 27"', price: 1499, stock: 8 },
  { name: "Headset USB", price: 259.5, stock: 0 },
  { name: "Webcam Full HD", price: 199.9, stock: 20 }
];

// indices em USERS/PRODUCTS; gera um historico com receita/estoque variados
// para o dashboard CRM ja nascer com graficos preenchidos.
const ORDER_SPECS = [
  { items: [{ product: 0, quantity: 1 }, { product: 1, quantity: 2 }], user: 0 },
  { items: [{ product: 2, quantity: 1 }], user: 1 },
  { items: [{ product: 4, quantity: 3 }], user: 0 },
  { items: [{ product: 0, quantity: 2 }, { product: 4, quantity: 1 }], user: 2 },
  { items: [{ product: 1, quantity: 1 }], user: 1 },
  { items: [{ product: 2, quantity: 1 }, { product: 1, quantity: 1 }], user: 3 }
];

async function alreadySeeded() {
  const data = await graphql("{ users { id } }");
  return data.users.length > 0;
}

async function createUsers() {
  const created = [];

  for (const input of USERS) {
    const data = await graphql(
      "mutation($input: CreateUserInput!) { createUser(input: $input) { id name } }",
      { input }
    );
    created.push(data.createUser);
  }

  return created;
}

async function createProducts() {
  const created = [];

  for (const input of PRODUCTS) {
    const data = await graphql(
      "mutation($input: CreateProductInput!) { createProduct(input: $input) { id name stock } }",
      { input }
    );
    created.push(data.createProduct);
  }

  return created;
}

async function createOrders(users, products) {
  const created = [];

  for (const spec of ORDER_SPECS) {
    const input = {
      items: spec.items.map((item) => ({
        productId: products[item.product].id,
        quantity: item.quantity
      })),
      userId: users[spec.user].id
    };

    const data = await graphql(
      "mutation($input: CreateOrderInput!) { createOrder(input: $input) { id total } }",
      { input }
    );
    created.push(data.createOrder);
  }

  return created;
}

async function main() {
  console.log(`Verificando API em ${endpoint}...`);

  if (await alreadySeeded()) {
    console.log("A API ja tem usuarios cadastrados - pulando seed (evita dados duplicados).");
    console.log("Reinicie os containers/servidor se quiser um seed limpo.");
    return;
  }

  console.log("Criando usuarios...");
  const users = await createUsers();

  console.log("Criando produtos...");
  const products = await createProducts();

  console.log("Criando pedidos...");
  const orders = await createOrders(users, products);

  const revenue = orders.reduce((total, order) => total + order.total, 0);

  console.log("\nSeed concluido:");
  console.log(
    JSON.stringify(
      {
        orders: orders.length,
        products: products.length,
        revenue: Math.round(revenue * 100) / 100,
        users: users.length
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`Falha ao popular dados: ${error.message}`);
  process.exit(1);
});
