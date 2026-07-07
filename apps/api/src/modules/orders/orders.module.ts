import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { CreateOrderUseCase, type OrderUnitOfWorkPort } from "@desafio/domain";
import { DomainErrorFilter } from "./domain-error.filter";
import { OrdersByUserLoader } from "./loaders/orders-by-user.loader";
import { OrderUnitOfWork } from "./order-unit-of-work";
import { OrdersRepository } from "./orders.repository";
import { OrdersResolver } from "./orders.resolver";
import { OrdersService } from "./orders.service";
import { PgDatabase } from "./persistence/postgres/pg-database";
import { PgOrderUnitOfWork } from "./persistence/postgres/pg-order-unit-of-work";
import { PgOrdersRepository } from "./persistence/postgres/pg-orders.repository";
import { PgProductsRepository } from "./persistence/postgres/pg-products.repository";
import { PgUsersRepository } from "./persistence/postgres/pg-users.repository";
import { ProductsRepository } from "./products.repository";
import {
  ORDER_UNIT_OF_WORK,
  ORDERS_REPOSITORY,
  PRODUCTS_REPOSITORY,
  USERS_REPOSITORY
} from "./repository.ports";
import { UsersRepository } from "./users.repository";

@Module({
  exports: [PgDatabase],
  providers: [
    // Ciclo de vida do pool do Postgres. Sem DATABASE_URL, `pool` e null e os
    // tokens abaixo caem nos repositorios in-memory - a mesma arquitetura de
    // portas serve os dois backends sem tocar em OrdersService.
    PgDatabase,
    UsersRepository,
    ProductsRepository,
    OrdersRepository,
    {
      inject: [PgDatabase, UsersRepository],
      provide: USERS_REPOSITORY,
      useFactory: (db: PgDatabase, memory: UsersRepository) =>
        db.pool ? new PgUsersRepository(db.pool) : memory
    },
    {
      inject: [PgDatabase, ProductsRepository],
      provide: PRODUCTS_REPOSITORY,
      useFactory: (db: PgDatabase, memory: ProductsRepository) =>
        db.pool ? new PgProductsRepository(db.pool) : memory
    },
    {
      inject: [PgDatabase, OrdersRepository],
      provide: ORDERS_REPOSITORY,
      useFactory: (db: PgDatabase, memory: OrdersRepository) =>
        db.pool ? new PgOrdersRepository(db.pool) : memory
    },
    {
      inject: [PgDatabase, ProductsRepository, OrdersRepository],
      provide: ORDER_UNIT_OF_WORK,
      useFactory: (db: PgDatabase, products: ProductsRepository, orders: OrdersRepository) =>
        db.pool ? new PgOrderUnitOfWork(db.pool) : new OrderUnitOfWork(products, orders)
    },
    {
      inject: [ORDER_UNIT_OF_WORK],
      provide: CreateOrderUseCase,
      useFactory: (unitOfWork: OrderUnitOfWorkPort) => new CreateOrderUseCase(unitOfWork)
    },
    // Global: traduz qualquer DomainError lancado por qualquer resolver/controller.
    { provide: APP_FILTER, useClass: DomainErrorFilter },
    OrdersByUserLoader,
    OrdersResolver,
    OrdersService
  ]
})
export class OrdersModule {}
