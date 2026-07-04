import { Injectable } from "@nestjs/common";

export interface StoredUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly createdAt: Date;
}

@Injectable()
export class UsersRepository {
  private readonly users = new Map<string, StoredUser>();
  private sequence = 1;

  public saveUser(input: { readonly name: string; readonly email: string }): StoredUser {
    const user: StoredUser = {
      createdAt: new Date(),
      email: input.email,
      id: `user-${this.sequence++}`,
      name: input.name
    };

    this.users.set(user.id, user);
    return user;
  }

  public findUserById(userId: string): StoredUser | undefined {
    return this.users.get(userId);
  }

  public hasUserWithEmail(email: string): boolean {
    const normalized = email.trim().toLowerCase();
    return [...this.users.values()].some((user) => user.email.toLowerCase() === normalized);
  }

  public listUsers(): readonly StoredUser[] {
    return [...this.users.values()];
  }
}
