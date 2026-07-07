<#
.SYNOPSIS
  Sobe o sistema completo (api, web, postgres, chroma, serverest) via
  docker-compose, verifica portas e health checks, e popula dados de
  demonstracao.

.PARAMETER NoSeed
  Pula a etapa de seed de dados de demonstracao.

.PARAMETER Rebuild
  Builda as imagens sem usar cache (docker compose build --no-cache).

.EXAMPLE
  ./scripts/start.ps1
  ./scripts/start.ps1 -Rebuild
  ./scripts/start.ps1 -NoSeed
#>
param(
    [switch]$NoSeed,
    [switch]$Rebuild
)

# "Continue" (nao "Stop"): comandos nativos como "docker compose build" escrevem
# o progresso do BuildKit em stderr, e com ErrorActionPreference=Stop o
# PowerShell 5.1 trata cada linha de stderr como erro fatal mesmo quando o
# comando termina com sucesso. As falhas reais sao detectadas via $LASTEXITCODE.
$ErrorActionPreference = "Continue"
Set-Location (Split-Path -Parent $PSScriptRoot)

$PortApi = 3333
$PortWeb = 3001
$PortPostgres = 5432
$PortChroma = 8000
$PortServerest = 3000

function Write-Info($message) { Write-Host "==> $message" -ForegroundColor Cyan }
function Write-Ok($message) { Write-Host "  ok $message" -ForegroundColor Green }
function Write-WarnLine($message) { Write-Host "  aviso $message" -ForegroundColor Yellow }
function Write-FailAndExit($message) {
    Write-Host "erro $message" -ForegroundColor Red
    exit 1
}

function Get-PortOwner([int]$Port) {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $connection) { return $null }
    try {
        $process = Get-Process -Id $connection.OwningProcess -ErrorAction Stop
        return "$($process.ProcessName) (pid $($connection.OwningProcess))"
    } catch {
        return "pid $($connection.OwningProcess)"
    }
}

function Wait-ForHttp([string]$Name, [string]$Url, [int]$TimeoutSeconds = 90) {
    Write-Info "Aguardando $Name responder em $Url..."
    $waited = 0
    while ($true) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -eq 200) { break }
        } catch {
            # ainda nao esta pronto, continua tentando
        }
        Start-Sleep -Seconds 2
        $waited += 2
        if ($waited -ge $TimeoutSeconds) {
            Write-FailAndExit "$Name nao respondeu em $Url apos ${TimeoutSeconds}s. Rode 'docker compose logs' para investigar."
        }
    }
    Write-Ok "$Name respondendo em $Url (${waited}s)"
}

Write-Host "==================================================================="
Write-Host " Desafio Winnin - subindo api, web, postgres, chroma e serverest"
Write-Host "==================================================================="

# 1. Docker disponivel e daemon ativo
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-FailAndExit "Docker CLI nao encontrado no PATH."
}
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-FailAndExit "Docker daemon nao esta rodando. Abra o Docker Desktop e tente de novo."
}
Write-Ok "Docker daemon ativo"

# 2. Verificacao de portas ocupadas por processos fora do compose
Write-Info "Verificando portas (3333, 3001, 5432, 8000, 3000)..."
foreach ($port in @($PortApi, $PortWeb, $PortPostgres, $PortChroma, $PortServerest)) {
    $owner = Get-PortOwner -Port $port
    if ($owner) {
        Write-WarnLine "porta $port ja em uso por: $owner (pode ser um container deste projeto de uma execucao anterior)"
    }
}

# 3. Build das imagens (api e web tem Dockerfile; as demais sao imagens prontas)
if ($Rebuild) {
    Write-Info "Buildando imagens (-Rebuild forcando sem cache)..."
    docker compose build --no-cache
} else {
    Write-Info "Buildando imagens..."
    docker compose build
}
if ($LASTEXITCODE -ne 0) { Write-FailAndExit "Falha ao buildar as imagens." }
Write-Ok "Imagens prontas"

# 4. Sobe todos os servicos
Write-Info "Subindo containers (docker compose up -d)..."
docker compose up -d
if ($LASTEXITCODE -ne 0) { Write-FailAndExit "Falha ao subir os containers." }
Write-Ok "Containers criados"

# 5. Health checks reais (nao so o status reportado pelo Docker)
Wait-ForHttp -Name "api" -Url "http://localhost:$PortApi/health/ready" -TimeoutSeconds 120
Wait-ForHttp -Name "web" -Url "http://localhost:$PortWeb/" -TimeoutSeconds 120
Wait-ForHttp -Name "serverest" -Url "http://localhost:$PortServerest/usuarios" -TimeoutSeconds 60

Write-Host ""
docker compose ps

# 6. Seed de dados de demonstracao
if ($NoSeed) {
    Write-WarnLine "Seed pulado (-NoSeed)."
} elseif (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-WarnLine "Node.js nao encontrado no host - seed pulado. Instale o Node ou rode 'node scripts/seed.mjs' de dentro de um ambiente com Node."
} else {
    Write-Info "Populando dados de demonstracao..."
    $env:API_URL = "http://localhost:$PortApi"
    node "$PWD/scripts/seed.mjs"
    if ($LASTEXITCODE -ne 0) {
        Write-WarnLine "Seed falhou - a API pode nao ter terminado de subir. Rode 'node scripts/seed.mjs' manualmente."
    }
}

Write-Host ""
Write-Host "==================================================================="
Write-Host " Pronto! URLs disponiveis:"
Write-Host "   API GraphQL ......... http://localhost:$PortApi/graphql"
Write-Host "   API Swagger (REST) .. http://localhost:$PortApi/docs"
Write-Host "   API metrics ......... http://localhost:$PortApi/metrics"
Write-Host "   Web (Anime Explorer)  http://localhost:$PortWeb/"
Write-Host "   Web (CRM Pedidos) ... http://localhost:$PortWeb/pedidos"
Write-Host "   ServeRest ........... http://localhost:$PortServerest/"
Write-Host "   ChromaDB ............ http://localhost:$PortChroma/"
Write-Host "   Postgres ............ localhost:$PortPostgres (postgres/postgres/desafio)"
Write-Host ""
Write-Host " Comandos uteis:"
Write-Host "   docker compose logs -f       # acompanhar logs"
Write-Host "   node scripts/seed.mjs        # popular dados de novo"
Write-Host "   docker compose down          # derrubar tudo"
Write-Host "==================================================================="
