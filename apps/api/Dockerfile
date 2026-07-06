# syntax=docker/dockerfile:1
# Build no contexto da raiz do monorepo: docker build -f apps/api/Dockerfile .

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/qa/package.json apps/qa/
COPY apps/web/package.json apps/web/
COPY packages/ai-agent/package.json packages/ai-agent/
COPY packages/domain/package.json packages/domain/
COPY packages/testing/package.json packages/testing/
RUN pnpm install --frozen-lockfile

COPY packages/ai-agent packages/ai-agent
COPY packages/domain packages/domain
COPY apps/api apps/api
RUN pnpm --filter @desafio/domain build \
  && pnpm --filter @desafio/ai-agent build \
  && pnpm --filter @desafio/api build
RUN pnpm --filter @desafio/api deploy --prod /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out .
USER node
EXPOSE 3333
CMD ["node", "dist/apps/api/src/main.js"]
