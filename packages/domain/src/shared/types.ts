export type EntityId = string;
export type MoneyCents = number;

export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  public now(): Date {
    return new Date();
  }
}

