import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { CreateOrderUseCase } from "@desafio/domain";
import { DomainErrorFilter } from "./domain-error.filter";
import { OrderUnitOfWork } from "./order-unit-of-work";
import { OrdersRepository } from "./orders.repository";
import { OrdersResolver } from "./orders.resolver";
import { OrdersService } from "./orders.service";
import { ProductsRepository } from "./products.repository";
import { ORDERS_REPOSITORY, PRODUCTS_REPOSITORY, USERS_REPOSITORY } from "./repository.ports";
import { UsersRepository } from "./users.repository";

@Module({
  providers: [
    // Classes concretas: usadas pela OrderUnitOfWork (precisa de snapshot/restore,
    // que nao faz parte da porta publica consumida pelo OrdersService).
    UsersRepository,
    ProductsRepository,
    OrdersRepository,
    // Tokens de porta: o OrdersService depende so destes, nunca das classes
    // acima. Trocar a implementacao in-memory por Postgres exige mudar apenas
    // o useExisting/useClass abaixo, sem tocar em OrdersService.
    { provide: USERS_REPOSITORY, useExisting: UsersRepository },
    { provide: PRODUCTS_REPOSITORY, useExisting: ProductsRepository },
    { provide: ORDERS_REPOSITORY, useExisting: OrdersRepository },
    OrderUnitOfWork,
    {
      inject: [OrderUnitOfWork],
      provide: CreateOrderUseCase,
      useFactory: (unitOfWork: OrderUnitOfWork) => new CreateOrderUseCase(unitOfWork)
    },
    // Global: traduz qualquer DomainError lancado por qualquer resolver/controller.
    { provide: APP_FILTER, useClass: DomainErrorFilter },
    OrdersResolver,
    OrdersService
  ]
})
export class OrdersModule {}

