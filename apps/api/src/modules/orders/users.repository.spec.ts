import { describe, expect, it } from "vitest";
import { UsersRepository } from "./users.repository";

describe("UsersRepository", () => {
  it("saves a user with a sequential id and a creation timestamp", async () => {
    const repository = new UsersRepository();

    const first = await repository.saveUser({ email: "a@example.com", name: "A" });
    const second = await repository.saveUser({ email: "b@example.com", name: "B" });

    expect(first.id).toBe("user-1");
    expect(second.id).toBe("user-2");
    expect(first.createdAt).toBeInstanceOf(Date);
  });

  it("finds a user by id", async () => {
    const repository = new UsersRepository();
    const user = await repository.saveUser({ email: "a@example.com", name: "A" });

    expect(await repository.findUserById(user.id)).toEqual(user);
    expect(await repository.findUserById("missing")).toBeUndefined();
  });

  it("detects an existing email ignoring case", async () => {
    const repository = new UsersRepository();
    await repository.saveUser({ email: "user@example.com", name: "User" });

    expect(await repository.hasUserWithEmail("USER@example.com")).toBe(true);
    expect(await repository.hasUserWithEmail("other@example.com")).toBe(false);
  });

  it("lists every stored user", async () => {
    const repository = new UsersRepository();
    await repository.saveUser({ email: "a@example.com", name: "A" });
    await repository.saveUser({ email: "b@example.com", name: "B" });

    expect(await repository.listUsers()).toHaveLength(2);
  });
});
