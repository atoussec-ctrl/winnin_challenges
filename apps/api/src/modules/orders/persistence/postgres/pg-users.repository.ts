import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { StoredUser, UsersRepositoryPort } from "../../repository.ports";

interface UserRow {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly created_at: Date;
}

function toStoredUser(row: UserRow): StoredUser {
  return { createdAt: row.created_at, email: row.email, id: row.id, name: row.name };
}

export class PgUsersRepository implements UsersRepositoryPort {
  public constructor(private readonly pool: Pool) {}

  public async saveUser(input: {
    readonly name: string;
    readonly email: string;
  }): Promise<StoredUser> {
    const { rows } = await this.pool.query<UserRow>(
      `INSERT INTO users (id, name, email)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [randomUUID(), input.name, input.email]
    );

    return toStoredUser(rows[0]!);
  }

  public async findUserById(userId: string): Promise<StoredUser | undefined> {
    const { rows } = await this.pool.query<UserRow>(
      "SELECT id, name, email, created_at FROM users WHERE id = $1",
      [userId]
    );

    return rows[0] ? toStoredUser(rows[0]) : undefined;
  }

  public async hasUserWithEmail(email: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      "SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [email.trim()]
    );

    return (rowCount ?? 0) > 0;
  }

  public async listUsers(): Promise<readonly StoredUser[]> {
    const { rows } = await this.pool.query<UserRow>(
      "SELECT id, name, email, created_at FROM users ORDER BY created_at, id"
    );

    return rows.map(toStoredUser);
  }
}
