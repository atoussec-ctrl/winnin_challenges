"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult
} from "@tanstack/react-query";
import { motion, type Variants } from "framer-motion";
import { useMemo } from "react";
import {
  buildDailyRevenue,
  buildOrdersByUser,
  buildStockLevels,
  buildTopProducts,
  calculateKpis
} from "../../lib/analytics";
import { formatCurrencyBRL } from "../../lib/money";
import {
  createOrder,
  createProduct,
  createUser,
  listOrders,
  listProducts,
  listUsers
} from "../../lib/orders";
import { InlineAlert } from "../molecules/inline-alert";
import { StatTile } from "../molecules/stat-tile";
import { CatalogPanel } from "../organisms/catalog-panel";
import { CreateOrderCard } from "../organisms/create-order-card";
import { CreateProductCard } from "../organisms/create-product-card";
import { CreateUserCard } from "../organisms/create-user-card";
import type { FormSubmitState } from "../organisms/form-contract";
import { OrdersPanel } from "../organisms/orders-panel";
import { RevenueChart } from "../organisms/revenue-chart";
import { StockChart } from "../organisms/stock-chart";
import { TopProductsChart } from "../organisms/top-products-chart";
import { UsersOrdersChart } from "../organisms/users-orders-chart";
import { UsersPanel } from "../organisms/users-panel";

const REVENUE_DAYS = 14;
const CHART_ITEM_LIMIT = 6;

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: "easeOut" }, y: 0 }
};

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};

function toFormState<TInput, TResult>(
  mutation: UseMutationResult<TResult, Error, TInput>
): FormSubmitState<TInput> {
  return {
    errorMessage: mutation.error?.message ?? null,
    isPending: mutation.isPending,
    submit: async (input: TInput): Promise<boolean> => {
      try {
        await mutation.mutateAsync(input);
        return true;
      } catch {
        return false;
      }
    }
  };
}

function SectionTitle({ children }: { readonly children: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}

export function OrdersPageTemplate() {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({ queryFn: listUsers, queryKey: ["users"] });
  const productsQuery = useQuery({ queryFn: listProducts, queryKey: ["products"] });
  const ordersQuery = useQuery({ queryFn: listOrders, queryKey: ["orders"] });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] })
  });
  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] })
  });
  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] })
      ])
  });

  const users = usersQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const orders = ordersQuery.data ?? [];

  const kpis = useMemo(() => calculateKpis(orders, products, users), [orders, products, users]);
  const dailyRevenue = useMemo(() => buildDailyRevenue(orders, REVENUE_DAYS), [orders]);
  const stockLevels = useMemo(() => buildStockLevels(products, CHART_ITEM_LIMIT), [products]);
  const topProducts = useMemo(() => buildTopProducts(orders, CHART_ITEM_LIMIT), [orders]);
  const ordersByUser = useMemo(() => buildOrdersByUser(orders, CHART_ITEM_LIMIT), [orders]);

  const stockAlerts = kpis.lowStockCount + kpis.outOfStockCount;

  const loadError =
    usersQuery.error?.message ?? productsQuery.error?.message ?? ordersQuery.error?.message ?? null;

  return (
    <main className="min-h-screen bg-background">
      <motion.div
        animate="visible"
        className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8"
        initial="hidden"
        variants={containerVariants}
      >
        <motion.header className="flex flex-col gap-1" variants={sectionVariants}>
          <h1 className="text-2xl font-semibold tracking-normal">Pedidos</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe receita, estoque e usuarios, cadastre registros e emita pedidos em tempo
            real.
          </p>
        </motion.header>

        <InlineAlert message={loadError} tone="error" />

        <motion.section aria-label="Visao geral" className="flex flex-col gap-3" variants={sectionVariants}>
          <SectionTitle>Visao geral</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              format={formatCurrencyBRL}
              label="Receita total"
              value={kpis.totalRevenue}
            />
            <StatTile
              hint={`Ticket medio ${formatCurrencyBRL(kpis.averageOrderValue)}`}
              label="Pedidos"
              value={kpis.totalOrders}
            />
            <StatTile label="Usuarios" value={kpis.totalUsers} />
            <StatTile
              hint={`${kpis.outOfStockCount} sem estoque`}
              label="Alertas de estoque"
              value={stockAlerts}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RevenueChart data={dailyRevenue} />
            </div>
            <StockChart data={stockLevels} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <TopProductsChart data={topProducts} />
            <UsersOrdersChart data={ordersByUser} />
          </div>
        </motion.section>

        <motion.section aria-label="Operacoes" className="flex flex-col gap-3" variants={sectionVariants}>
          <SectionTitle>Operacoes</SectionTitle>
          <div className="grid gap-4 lg:grid-cols-3">
            <CreateUserCard form={toFormState(createUserMutation)} />
            <CreateProductCard form={toFormState(createProductMutation)} />
            <CreateOrderCard
              form={toFormState(createOrderMutation)}
              products={products}
              users={users}
            />
          </div>
        </motion.section>

        <motion.section aria-label="Registros" className="flex flex-col gap-3" variants={sectionVariants}>
          <SectionTitle>Registros</SectionTitle>
          <div className="grid gap-4 lg:grid-cols-2">
            <UsersPanel isLoading={usersQuery.isPending} orders={orders} users={users} />
            <CatalogPanel isLoading={productsQuery.isPending} products={products} />
          </div>
          <OrdersPanel isLoading={ordersQuery.isPending} orders={orders} />
        </motion.section>
      </motion.div>
    </main>
  );
}
