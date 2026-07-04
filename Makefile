.PHONY: setup run start seed test coverage down

setup:
	pnpm install
	docker compose up -d postgres chroma serverest

run:
	pnpm dev

# Sobe api, web, postgres, chroma e serverest via docker-compose, com health
# checks reais e seed de dados de demonstracao. Equivalente a scripts/start.sh.
start:
	bash scripts/start.sh

seed:
	node scripts/seed.mjs

test:
	pnpm test

coverage:
	pnpm coverage

down:
	docker compose down

