import { Args, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { OrdersByUserLoader } from "./loaders/orders-by-user.loader";
import {
  CreateOrderInput,
  CreateProductInput,
  CreateUserInput,
  OrderModel,
  ProductModel,
  UserModel
} from "./order.models";
import { OrdersService } from "./orders.service";

@Resolver(() => UserModel)
export class OrdersResolver {
  public constructor(
    private readonly ordersService: OrdersService,
    private readonly ordersByUserLoader: OrdersByUserLoader
  ) {}

  @Query(() => [UserModel])
  public users(): Promise<UserModel[]> {
    return this.ordersService.listUsers();
  }

  @Query(() => [ProductModel])
  public products(): Promise<ProductModel[]> {
    return this.ordersService.listProducts();
  }

  @Query(() => [OrderModel])
  public orders(): Promise<OrderModel[]> {
    return this.ordersService.listOrders();
  }

  // Batched via DataLoader (OrdersByUserLoader): resolve todos os User.orders
  // de uma query em uma unica chamada ao service, nao uma por usuario.
  @ResolveField("orders", () => [OrderModel])
  public userOrders(@Parent() user: UserModel): Promise<OrderModel[]> {
    return this.ordersByUserLoader.load(user.id);
  }

  @Mutation(() => UserModel)
  public createUser(@Args("input") input: CreateUserInput): Promise<UserModel> {
    return this.ordersService.createUser(input);
  }

  @Mutation(() => ProductModel)
  public createProduct(@Args("input") input: CreateProductInput): Promise<ProductModel> {
    return this.ordersService.createProduct(input);
  }

  @Mutation(() => OrderModel)
  public createOrder(@Args("input") input: CreateOrderInput): Promise<OrderModel> {
    return this.ordersService.createOrder(input);
  }
}
