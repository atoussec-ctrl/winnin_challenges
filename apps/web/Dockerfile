# syntax=docker/dockerfile:1
# Build no contexto da raiz do monorepo: docker build -f apps/web/Dockerfile .

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

# URL da API vista pelo navegador (embutida no bundle em build time).
# Vazia por padrao: o client deriva http(s)://<host da pagina>:3333 em runtime,
# o que funciona em localhost e no acesso via IP da rede local.
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/qa/package.json apps/qa/
COPY apps/web/package.json apps/web/
COPY packages/ai-agent/package.json packages/ai-agent/
COPY packages/domain/package.json packages/domain/
COPY packages/testing/package.json packages/testing/
RUN pnpm install --frozen-lockfile

COPY apps/web apps/web
RUN pnpm --filter @desafio/web build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=3001 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3001
CMD ["node", "apps/web/server.js"]
