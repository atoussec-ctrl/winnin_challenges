import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  CreateOrderUseCase,
  DomainError,
  InsufficientStockError,
  type Order,
  ProductNotFoundError
} from "@desafio/domain";
import type {
  CreateOrderInput,
  CreateProductInput,
  CreateUserInput,
  OrderModel,
  ProductModel,
  UserModel
} from "./order.models";
import { OrdersRepository } from "./orders.repository";
import { ProductsRepository, type StoredProduct } from "./products.repository";
import { UsersRepository, type StoredUser } from "./users.repository";

@Injectable()
export class OrdersService {
  public constructor(
    private readonly users: UsersRepository,
    private readonly products: ProductsRepository,
    private readonly orders: OrdersRepository,
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

    try {
      const order = await this.createOrderUseCase.execute(input);
      return this.toOrderModel(order);
    } catch (error) {
      throw this.translateDomainError(error);
    }
  }

  private translateDomainError(error: unknown): unknown {
    if (error instanceof ProductNotFoundError) {
      return new NotFoundException(error.message);
    }

    if (error instanceof InsufficientStockError) {
      return new ConflictException(error.message);
    }

    if (error instanceof DomainError) {
      return new BadRequestException(error.message);
    }

    return error;
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
