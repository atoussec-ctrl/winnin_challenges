# Frontend de Pedidos

## Objetivo

Interface Next.js para o servico de pedidos do backend (GraphQL em `apps/api`): um CRM de
pedidos com dashboard (KPIs e graficos animados), cadastro de usuarios e produtos, emissao
de pedidos e acompanhamento de catalogo, estoque e historico. Layout 100% responsivo.

## Stack

- Next.js App Router (`apps/web/app/pedidos`).
- Tailwind CSS + primitives no estilo shadcn/ui (`components/atoms`).
- TanStack Query para estado de servidor (queries, mutations e invalidation).
- Framer Motion para transicoes de secoes, listas, contadores e alertas.
- Recharts para os graficos do dashboard (area de receita e barras horizontais).
- Atomic Design: atoms -> molecules -> organisms -> templates -> pages.

## Estrutura

```text
app/
  providers.tsx                 QueryClientProvider (client component)
  pedidos/page.tsx              rota /pedidos
components/
  atoms/       card, label, select, stock-badge (+ button, input existentes)
  molecules/   form-field, inline-alert (animado), animated-number,
               stat-tile, chart-card, chart-tooltip
  organisms/   site-header, create-user-card, create-product-card,
               create-order-card, users-panel, catalog-panel, orders-panel,
               revenue-chart, stock-chart, top-products-chart, users-orders-chart
  templates/   orders-page-template (unico dono do TanStack Query)
lib/
  orders.ts       client GraphQL tipado (users, products, orders, mutations)
  order-draft.ts  regras puras do rascunho de pedido (itens, total, validacao)
  analytics.ts    agregacoes puras do dashboard (KPIs, series e rankings)
  format.ts       numeros compactos pt-BR para eixos de grafico
  money.ts        formatacao BRL
  stock.ts        tom do badge de estoque
```

## Dashboard (CRM)

- Layout em piramide invertida (padrao de CRMs/ERPs): "Visao geral" (KPIs + graficos) ->
  "Operacoes" (formularios) -> "Registros" (paineis detalhados), com stagger animado
  entre as secoes via Framer Motion.
- KPIs em `StatTile` com contador animado (`AnimatedNumber`): receita total, pedidos
  (com ticket medio), usuarios e alertas de estoque (com contagem de itens zerados).
- Graficos (Recharts, dados de `lib/analytics.ts`):
  - `RevenueChart`: area da receita diaria dos ultimos 14 dias (serie zero-preenchida em UTC).
  - `StockChart`: barras horizontais dos produtos com menor estoque.
  - `TopProductsChart`: mais vendidos por unidades.
  - `UsersOrdersChart`: pedidos por usuario.
- Especificacao visual: hue unico `--chart-accent` (validado para croma, luminancia e
  contraste nos temas claro e escuro), barras de 16px com ponta arredondada, linha de 2px,
  area com 10% de opacidade, grade hairline `--chart-grid`, tooltips customizados
  (`ChartTooltip`) e rotulos de valor na ponta das barras.
- Toda a agregacao e pura e testada em `lib/analytics.ts`; os componentes de grafico
  apenas renderizam.
- Responsividade: KPIs em 1/2/4 colunas (`sm`/`xl`), graficos e formularios empilham
  abaixo de `lg` e a linha de itens do pedido usa `flex-wrap` — em cards estreitos
  (mobile ou colunas `lg` do iPad) o campo Produto ocupa a linha inteira e Qtd/Remover
  descem para a linha seguinte, sem cortar texto dos selects.

## Fluxo de dados

- `orders-page-template` e o unico componente que conhece TanStack Query:
  - Queries: `["users"]`, `["products"]`, `["orders"]`.
  - Mutations invalidam as queries afetadas (`createOrder` invalida `orders` e `products`
    porque o estoque muda).
- Organisms de formulario recebem um contrato estreito `FormSubmitState<TInput>`
  (`submit`, `isPending`, `errorMessage`) e mantem apenas estado local de campos —
  ISP/DIP aplicados na UI.
- Regras de rascunho de pedido (agregacao, total estimado, validacao) vivem em
  `lib/order-draft.ts` como funcoes puras com testes unitarios.
- Erros do GraphQL chegam como mensagens do backend (validacao, email duplicado, estoque
  insuficiente) e sao exibidos no `InlineAlert` animado do formulario correspondente.

## Configuracao

- `NEXT_PUBLIC_API_URL` aponta para a API Nest.js. Sem a env, o client deriva
  `http(s)://<host da pagina>:3333` (`lib/api-base-url.ts`): abrir o web pelo IP da
  maquina (ex.: `http://192.168.0.10:3001/pedidos`) num celular/tablet da rede local
  encontra a API no mesmo host, sem configuracao extra.
- A API precisa estar de pe: `pnpm --filter @desafio/api dev`.
- Web: `pnpm --filter @desafio/web dev` e abrir `http://localhost:3001/pedidos`.

## Testes

- Unit (Vitest): `lib/orders.test.ts` (client GraphQL com fetch mockado, erros HTTP/GraphQL,
  base URL configuravel e derivada do host da pagina), `lib/api-base-url.test.ts`,
  `lib/order-draft.test.ts`, `lib/analytics.test.ts`, `lib/format.test.ts`,
  `lib/money.test.ts`, `lib/stock.test.ts`.
- Cobertura de `lib/**` com gate de 95% (100% atual).
- Componentes seguem o padrao do projeto: logica extraida para `lib` puro e testado;
  proximos passos incluem Testing Library para organisms e um E2E Playwright do fluxo
  criar usuario -> produto -> pedido.
