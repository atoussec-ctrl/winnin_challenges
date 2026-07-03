import type { Metadata } from "next";
import { OrdersPageTemplate } from "../../components/templates/orders-page-template";

export const metadata: Metadata = {
  description: "Gestao de usuarios, produtos e pedidos via GraphQL.",
  title: "Pedidos"
};

export default function PedidosPage() {
  return <OrdersPageTemplate />;
}
