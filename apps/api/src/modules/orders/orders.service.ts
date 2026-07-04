import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CreateOrderUseCase, type Order } from "@desafio/domain";
import type {
  CreateOrderInput,
  CreateProductInput,
  CreateUserInput,
  OrderModel,
  ProductModel,
  UserModel
} from "./order.models";
import {
  ORDERS_REPOSITORY,
  PRODUCTS_REPOSITORY,
  USERS_REPOSITORY,
  type OrdersRepositoryPort,
  type ProductsRepositoryPort,
  type StoredProduct,
  type StoredUser,
  type UsersRepositoryPort
} from "./repository.ports";

@Injectable()
export class OrdersService {
  public constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepositoryPort,
    @Inject(PRODUCTS_REPOSITORY) private readonly products: ProductsRepositoryPort,
    @Inject(ORDERS_REPOSITORY) private readonly orders: OrdersRepositoryPort,
    private readonly createOrderUseCase: CreateOrderUseCase
  ) {}

  public listUsers(): UserModel[] {
    return this.users.listUsers().map((user) => this.toUserModel(user));
  }

  public listProducts(): ProductModel[] {
    return this.products.listProducts().map((product) => this.toProductModel(product));
  }

  public listOrders(): OrderModel[] {
    return this.orders.listOrders().map((order) => this.toOrderModel(order));
  }

  public listOrdersByUserId(userId: string): OrderModel[] {
    return this.orders.listOrdersByUserId(userId).map((order) => this.toOrderModel(order));
  }

  public createUser(input: CreateUserInput): UserModel {
    if (this.users.hasUserWithEmail(input.email)) {
      throw new ConflictException(`Email ${input.email} is already in use.`);
    }

    return this.toUserModel(
      this.users.saveUser({
        email: input.email.trim(),
        name: input.name.trim()
      })
    );
  }

  public createProduct(input: CreateProductInput): ProductModel {
    return this.toProductModel(
      this.products.saveProduct({
        name: input.name.trim(),
        priceCents: Math.round(input.price * 100),
        stock: input.stock
      })
    );
  }

  public async createOrder(input: CreateOrderInput): Promise<OrderModel> {
    const user = this.users.findUserById(input.userId);

    if (!user) {
      throw new NotFoundException(`User ${input.userId} was not found.`);
    }

    // Erros de dominio (estoque insuficiente, produto inexistente etc.) sao
    // traduzidos globalmente pelo DomainErrorFilter (APP_FILTER), nao aqui.
    const order = await this.createOrderUseCase.execute(input);
    return this.toOrderModel(order);
  }

  private toUserModel(user: StoredUser): UserModel {
    return {
      createdAt: user.createdAt,
      email: user.email,
      id: user.id,
      name: user.name
    };
  }

  private toProductModel(product: StoredProduct): ProductModel {
    return {
      createdAt: product.createdAt,
      id: product.id,
      name: product.name,
      price: product.priceCents / 100,
      stock: product.stock
    };
  }

  private toOrderModel(order: Order): OrderModel {
    const user = this.users.findUserById(order.userId);

    if (!user) {
      throw new NotFoundException(`User ${order.userId} was not found.`);
    }

    return {
      createdAt: order.createdAt,
      id: order.id,
      items: order.items.map((item) => {
        const product = this.products.findProductById(item.productId);

        if (!product) {
          throw new NotFoundException(`Product ${item.productId} was not found.`);
        }

        return {
          price: item.unitPriceCents / 100,
          product: this.toProductModel(product),
          quantity: item.quantity
        };
      }),
      total: order.totalCents / 100,
      user: this.toUserModel(user)
    };
  }
}
