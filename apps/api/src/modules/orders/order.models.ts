import { Field, Float, ID, InputType, Int, ObjectType } from "@nestjs/graphql";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsPositive,
  Max,
  Min,
  ValidateNested
} from "class-validator";

const MAX_PRICE = 1_000_000_000;
const MAX_STOCK = 1_000_000;
const MAX_ORDER_ITEMS = 100;
const MAX_ITEM_QUANTITY = 10_000;

const PRICE_MESSAGE = `Product price must be greater than zero and at most ${MAX_PRICE}.`;
const STOCK_MESSAGE = `Product stock must be an integer between zero and ${MAX_STOCK}.`;
const ITEM_QUANTITY_MESSAGE = `Item quantity must be an integer between 1 and ${MAX_ITEM_QUANTITY}.`;
const ORDER_ITEMS_MESSAGE = `Order must contain between 1 and ${MAX_ORDER_ITEMS} items.`;

@ObjectType("User")
export class UserModel {
  @Field(() => ID)
  public id!: string;

  @Field()
  public name!: string;

  @Field()
  public email!: string;

  @Field()
  public createdAt!: Date;
}

@ObjectType("Product")
export class ProductModel {
  @Field(() => ID)
  public id!: string;

  @Field()
  public name!: string;

  @Field(() => Float)
  public price!: number;

  @Field(() => Int)
  public stock!: number;

  @Field()
  public createdAt!: Date;
}

@ObjectType("OrderItem")
export class OrderItemModel {
  @Field(() => ProductModel)
  public product!: ProductModel;

  @Field(() => Int)
  public quantity!: number;

  @Field(() => Float)
  public price!: number;
}

@ObjectType("Order")
export class OrderModel {
  @Field(() => ID)
  public id!: string;

  @Field(() => UserModel)
  public user!: UserModel;

  @Field(() => [OrderItemModel])
  public items!: OrderItemModel[];

  @Field(() => Float)
  public total!: number;

  @Field()
  public createdAt!: Date;
}

function trimIfString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim() : value;
}

@InputType()
export class CreateUserInput {
  @Field()
  @Transform(trimIfString)
  @IsNotEmpty({ message: "User name is required." })
  public name!: string;

  @Field()
  @IsEmail({}, { message: "User email format is invalid." })
  public email!: string;
}

@InputType()
export class CreateProductInput {
  @Field()
  @Transform(trimIfString)
  @IsNotEmpty({ message: "Product name is required." })
  public name!: string;

  @Field(() => Float)
  @IsPositive({ message: PRICE_MESSAGE })
  @Max(MAX_PRICE, { message: PRICE_MESSAGE })
  public price!: number;

  @Field(() => Int)
  @IsInt({ message: STOCK_MESSAGE })
  @Min(0, { message: STOCK_MESSAGE })
  @Max(MAX_STOCK, { message: STOCK_MESSAGE })
  public stock!: number;
}

@InputType()
export class CreateOrderItemInput {
  @Field(() => ID)
  @Transform(trimIfString)
  @IsNotEmpty({ message: "Product id is required." })
  public productId!: string;

  @Field(() => Int)
  @IsInt({ message: ITEM_QUANTITY_MESSAGE })
  @Min(1, { message: ITEM_QUANTITY_MESSAGE })
  @Max(MAX_ITEM_QUANTITY, { message: ITEM_QUANTITY_MESSAGE })
  public quantity!: number;
}

@InputType()
export class CreateOrderInput {
  @Field(() => ID)
  @Transform(trimIfString)
  @IsNotEmpty({ message: "User id is required." })
  public userId!: string;

  @Field(() => [CreateOrderItemInput])
  @ArrayMinSize(1, { message: ORDER_ITEMS_MESSAGE })
  @ArrayMaxSize(MAX_ORDER_ITEMS, { message: ORDER_ITEMS_MESSAGE })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemInput)
  public items!: CreateOrderItemInput[];
}

