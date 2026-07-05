import type { ExecutionContext } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { GqlExecutionContext, type GqlContextType } from "@nestjs/graphql";
import { ThrottlerGuard } from "@nestjs/throttler";

interface RequestResponsePair {
  readonly req: Record<string, unknown>;
  readonly res: Record<string, unknown>;
}

// ThrottlerGuard, por padrao, extrai req/res via context.switchToHttp(), que
// devolve campos undefined para uma execucao GraphQL - toda mutation/query
// quebrava com "Cannot read properties of undefined (reading 'ip')" antes
// deste override (comprovado ao vivo contra a API rodando).
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected override getRequestResponse(context: ExecutionContext): RequestResponsePair {
    if (context.getType<GqlContextType>() !== "graphql") {
      return super.getRequestResponse(context);
    }

    const gqlContext = GqlExecutionContext.create(context).getContext<RequestResponsePair>();
    return { req: gqlContext.req, res: gqlContext.res };
  }
}
