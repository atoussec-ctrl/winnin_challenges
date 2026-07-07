#!/usr/bin/env bash
# Sobe o sistema completo (api, web, postgres, chroma, serverest) via
# docker-compose, verifica portas e health checks, e popula dados de
# demonstracao. Uso: ./scripts/start.sh [--no-seed] [--rebuild]

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

NO_SEED=false
REBUILD=false
for arg in "$@"; do
  case "$arg" in
    --no-seed) NO_SEED=true ;;
    --rebuild) REBUILD=true ;;
    *)
      echo "Argumento desconhecido: $arg (use --no-seed ou --rebuild)" >&2
      exit 1
      ;;
  esac
done

PORTS_API=3333
PORTS_WEB=3001
PORTS_POSTGRES=5432
PORTS_CHROMA=8000
PORTS_SERVEREST=3000

info()  { printf '\033[36m==>\033[0m %s\n' "$1"; }
ok()    { printf '\033[32m  ok\033[0m %s\n' "$1"; }
warn()  { printf '\033[33m  aviso\033[0m %s\n' "$1"; }
fail()  { printf '\033[31merro\033[0m %s\n' "$1" >&2; exit 1; }

port_owner() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | awk 'NR==2 {print $1" (pid "$2")"}'
  elif command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :$port" 2>/dev/null | awk 'NR==2 {print $0}'
  fi
}

wait_for_http() {
  local name="$1" url="$2" timeout="${3:-90}"
  local waited=0
  info "Aguardando $name responder em $url..."
  while ! curl -fsS -o /dev/null "$url" 2>/dev/null; do
    sleep 2
    waited=$((waited + 2))
    if [ "$waited" -ge "$timeout" ]; then
      fail "$name nao respondeu em $url apos ${timeout}s. Rode 'docker compose logs' para investigar."
    fi
  done
  ok "$name respondendo em $url (${waited}s)"
}

echo "==================================================================="
echo " Desafio Winnin - subindo api, web, postgres, chroma e serverest"
echo "==================================================================="

# 1. Docker disponivel e daemon ativo
command -v docker >/dev/null 2>&1 || fail "Docker CLI nao encontrado no PATH."
docker info >/dev/null 2>&1 || fail "Docker daemon nao esta rodando. Abra o Docker Desktop e tente de novo."
ok "Docker daemon ativo"

# 2. Verificacao de portas ocupadas por processos fora do compose
info "Verificando portas (3333, 3001, 5432, 8000, 3000)..."
for port in $PORTS_API $PORTS_WEB $PORTS_POSTGRES $PORTS_CHROMA $PORTS_SERVEREST; do
  owner=$(port_owner "$port" || true)
  if [ -n "${owner:-}" ]; then
    warn "porta $port ja em uso por: $owner (pode ser um container deste projeto de uma execucao anterior)"
  fi
done

# 3. Build das imagens (api e web tem Dockerfile; as demais sao imagens prontas)
if [ "$REBUILD" = true ]; then
  info "Buildando imagens (--rebuild forcando sem cache)..."
  docker compose build --no-cache
else
  info "Buildando imagens..."
  docker compose build
fi
ok "Imagens prontas"

# 4. Sobe todos os servicos
info "Subindo containers (docker compose up -d)..."
docker compose up -d
ok "Containers criados"

# 5. Health checks reais (nao so o status reportado pelo Docker)
wait_for_http "api" "http://localhost:${PORTS_API}/health/ready" 120
wait_for_http "web" "http://localhost:${PORTS_WEB}/" 120
wait_for_http "serverest" "http://localhost:${PORTS_SERVEREST}/usuarios" 60

echo
docker compose ps

# 6. Seed de dados de demonstracao
if [ "$NO_SEED" = true ]; then
  warn "Seed pulado (--no-seed)."
elif ! command -v node >/dev/null 2>&1; then
  warn "Node.js nao encontrado no host - seed pulado. Instale o Node ou rode 'node scripts/seed.mjs' de dentro de um ambiente com Node."
else
  info "Populando dados de demonstracao..."
  API_URL="http://localhost:${PORTS_API}" node "$(pwd)/scripts/seed.mjs" || warn "Seed falhou - a API pode nao ter terminado de subir. Rode 'node scripts/seed.mjs' manualmente."
fi

echo
echo "==================================================================="
echo " Pronto! URLs disponiveis:"
echo "   API GraphQL ......... http://localhost:${PORTS_API}/graphql"
echo "   API Swagger (REST) .. http://localhost:${PORTS_API}/docs"
echo "   API metrics ......... http://localhost:${PORTS_API}/metrics"
echo "   Web (Anime Explorer)  http://localhost:${PORTS_WEB}/"
echo "   Web (CRM Pedidos) ... http://localhost:${PORTS_WEB}/pedidos"
echo "   ServeRest ........... http://localhost:${PORTS_SERVEREST}/"
echo "   ChromaDB ............ http://localhost:${PORTS_CHROMA}/"
echo "   Postgres ............ localhost:${PORTS_POSTGRES} (postgres/postgres/desafio)"
echo
echo " Comandos uteis:"
echo "   docker compose logs -f       # acompanhar logs"
echo "   node scripts/seed.mjs        # popular dados de novo"
echo "   docker compose down          # derrubar tudo"
echo "==================================================================="
