import { describe, expect, it } from "vitest";
import { UsersRepository } from "./users.repository";

describe("UsersRepository", () => {
  it("saves a user with a sequential id and a creation timestamp", () => {
    const repository = new UsersRepository();

    const first = repository.saveUser({ email: "a@example.com", name: "A" });
    const second = repository.saveUser({ email: "b@example.com", name: "B" });

    expect(first.id).toBe("user-1");
    expect(second.id).toBe("user-2");
    expect(first.createdAt).toBeInstanceOf(Date);
  });

  it("finds a user by id", () => {
    const repository = new UsersRepository();
    const user = repository.saveUser({ email: "a@example.com", name: "A" });

    expect(repository.findUserById(user.id)).toEqual(user);
    expect(repository.findUserById("missing")).toBeUndefined();
  });

  it("detects an existing email ignoring case", () => {
    const repository = new UsersRepository();
    repository.saveUser({ email: "user@example.com", name: "User" });

    expect(repository.hasUserWithEmail("USER@example.com")).toBe(true);
    expect(repository.hasUserWithEmail("other@example.com")).toBe(false);
  });

  it("lists every stored user", () => {
    const repository = new UsersRepository();
    repository.saveUser({ email: "a@example.com", name: "A" });
    repository.saveUser({ email: "b@example.com", name: "B" });

    expect(repository.listUsers()).toHaveLength(2);
  });
});
