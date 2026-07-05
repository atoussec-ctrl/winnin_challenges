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

  public async listUsers(): Promise<UserModel[]> {
    const users = await this.users.listUsers();
    return users.map((user) => this.toUserModel(user));
  }

  public async listProducts(): Promise<ProductModel[]> {
    const products = await this.products.listProducts();
    return products.map((product) => this.toProductModel(product));
  }

  public async listOrders(): Promise<OrderModel[]> {
    const orders = await this.orders.listOrders();
    return Promise.all(orders.map((order) => this.toOrderModel(order)));
  }

  // Uma unica chamada ao repositorio para todos os userIds pedidos - consumida
  // pelo OrdersByUserLoader (DataLoader) para resolver User.orders sem N+1.
  public async listOrdersByUserIds(
    userIds: readonly string[]
  ): Promise<ReadonlyMap<string, OrderModel[]>> {
    const grouped = await this.orders.listOrdersByUserIds(userIds);
    const result = new Map<string, OrderModel[]>();

    for (const userId of userIds) {
      result.set(
        userId,
        await Promise.all((grouped.get(userId) ?? []).map((order) => this.toOrderModel(order)))
      );
    }

    return result;
  }

  public async createUser(input: CreateUserInput): Promise<UserModel> {
    if (await this.users.hasUserWithEmail(input.email)) {
      throw new ConflictException(`Email ${input.email} is already in use.`);
    }

    return this.toUserModel(
      await this.users.saveUser({
        email: input.email.trim(),
        name: input.name.trim()
      })
    );
  }

  public async createProduct(input: CreateProductInput): Promise<ProductModel> {
    return this.toProductModel(
      await this.products.saveProduct({
        name: input.name.trim(),
        priceCents: Math.round(input.price * 100),
        stock: input.stock
      })
    );
  }

  public async createOrder(input: CreateOrderInput): Promise<OrderModel> {
    const user = await this.users.findUserById(input.userId);

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

  private async toOrderModel(order: Order): Promise<OrderModel> {
    const user = await this.users.findUserById(order.userId);

    if (!user) {
      throw new NotFoundException(`User ${order.userId} was not found.`);
    }

    const items = await Promise.all(
      order.items.map(async (item) => {
        const product = await this.products.findProductById(item.productId);

        if (!product) {
          throw new NotFoundException(`Product ${item.productId} was not found.`);
        }

        return {
          price: item.unitPriceCents / 100,
          product: this.toProductModel(product),
          quantity: item.quantity
        };
      })
    );

    return {
      createdAt: order.createdAt,
      id: order.id,
      items,
      total: order.totalCents / 100,
      user: this.toUserModel(user)
    };
  }
}
