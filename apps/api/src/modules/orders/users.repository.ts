import { Injectable } from "@nestjs/common";
import type { StoredUser, UsersRepositoryPort } from "./repository.ports";

@Injectable()
export class UsersRepository implements UsersRepositoryPort {
  private readonly users = new Map<string, StoredUser>();
  private sequence = 1;

  public saveUser(input: { readonly name: string; readonly email: string }): Promise<StoredUser> {
    const user: StoredUser = {
      createdAt: new Date(),
      email: input.email,
      id: `user-${this.sequence++}`,
      name: input.name
    };

    this.users.set(user.id, user);
    return Promise.resolve(user);
  }

  public findUserById(userId: string): Promise<StoredUser | undefined> {
    return Promise.resolve(this.users.get(userId));
  }

  public hasUserWithEmail(email: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    return Promise.resolve(
      [...this.users.values()].some((user) => user.email.toLowerCase() === normalized)
    );
  }

  public listUsers(): Promise<readonly StoredUser[]> {
    return Promise.resolve([...this.users.values()]);
  }
}
