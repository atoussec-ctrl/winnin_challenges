import { Module } from "@nestjs/common";
import { CreateOrderUseCase } from "@desafio/domain";
import { OrderUnitOfWork } from "./order-unit-of-work";
import { OrdersRepository } from "./orders.repository";
import { OrdersResolver } from "./orders.resolver";
import { OrdersService } from "./orders.service";
import { ProductsRepository } from "./products.repository";
import { UsersRepository } from "./users.repository";

@Module({
  providers: [
    UsersRepository,
    ProductsRepository,
    OrdersRepository,
    OrderUnitOfWork,
    {
      inject: [OrderUnitOfWork],
      provide: CreateOrderUseCase,
      useFactory: (unitOfWork: OrderUnitOfWork) => new CreateOrderUseCase(unitOfWork)
    },
    OrdersResolver,
    OrdersService
  ]
})
export class OrdersModule {}

