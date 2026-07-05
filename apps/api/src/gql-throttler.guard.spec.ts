import type { ExecutionContext } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { GqlThrottlerGuard } from "./gql-throttler.guard";

function createGraphqlContext(context: { req: unknown; res: unknown }): ExecutionContext {
  return {
    getArgByIndex: (index: number) => (index === 2 ? context : undefined),
    getArgs: () => [undefined, {}, context, {}],
    getClass: () => class FakeResolver {},
    getHandler: () => function fakeHandler() {},
    getType: () => "graphql"
  } as unknown as ExecutionContext;
}

function createHttpContext(request: unknown, response: unknown): ExecutionContext {
  return {
    getType: () => "http",
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response
    })
  } as unknown as ExecutionContext;
}

describe("GqlThrottlerGuard", () => {
  it("extracts req/res from the GraphQL context instead of switchToHttp", () => {
    const guard = new GqlThrottlerGuard([], { increment: () => Promise.resolve() } as never, {
      get: () => undefined
    } as never);
    const req = { headers: { "user-agent": "test" }, ip: "127.0.0.1" };
    const res = { setHeader: () => undefined };

    const result = (
      guard as unknown as {
        getRequestResponse(context: ExecutionContext): { req: unknown; res: unknown };
      }
    ).getRequestResponse(createGraphqlContext({ req, res }));

    expect(result).toEqual({ req, res });
  });

  it("falls back to switchToHttp for non-GraphQL contexts", () => {
    const guard = new GqlThrottlerGuard([], { increment: () => Promise.resolve() } as never, {
      get: () => undefined
    } as never);
    const req = { headers: {}, ip: "127.0.0.1" };
    const res = { setHeader: () => undefined };

    const result = (
      guard as unknown as {
        getRequestResponse(context: ExecutionContext): { req: unknown; res: unknown };
      }
    ).getRequestResponse(createHttpContext(req, res));

    expect(result).toEqual({ req, res });
  });
});
