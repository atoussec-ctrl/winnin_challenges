import { Injectable, Scope } from "@nestjs/common";
import DataLoader from "dataloader";
import type { OrderModel } from "../order.models";
import { OrdersService } from "../orders.service";

// Escopo REQUEST: cada requisicao GraphQL ganha um DataLoader novo, evitando
// que o cache de um loader vaze pedidos entre requisicoes diferentes. Como o
// resolver injeta este loader, ele passa a ser request-scoped tambem - custo
// aceitavel e o padrao usual para resolver N+1 com DataLoader no NestJS.
@Injectable({ scope: Scope.REQUEST })
export class OrdersByUserLoader extends DataLoader<string, OrderModel[]> {
  public constructor(ordersService: OrdersService) {
    super(async (userIds) => {
      const grouped = await ordersService.listOrdersByUserIds(userIds);
      return userIds.map((userId) => grouped.get(userId) ?? []);
    });
  }
}
