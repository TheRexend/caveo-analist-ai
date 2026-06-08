#!/usr/bin/env bash
# Caveo Analyst AI — Dashboard
# Uso: ./dashboard/start.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Dependências Python ───────────────────────────────────────────────────────
echo "→ Verificando dependências Python…"

# Criar venv se não existir (necessário para google-ads SDK via gRPC)
if [ ! -f ".venv/bin/python3" ]; then
  echo "  criando venv…"
  python3 -m venv .venv
fi

PYTHON=".venv/bin/python3"

# Instalar/atualizar dependências no venv
"$PYTHON" -c "import flask, google.ads.googleads" 2>/dev/null || \
  "$PYTHON" -m pip install --quiet flask google-ads 2>/dev/null || true

# ── Iniciar servidor ──────────────────────────────────────────────────────────
PORT=8765
echo "→ Iniciando servidor na porta $PORT…"

# Matar processo anterior se houver
lsof -ti tcp:$PORT | xargs kill -9 2>/dev/null || true

"$PYTHON" server.py &
SERVER_PID=$!

# Aguardar o servidor responder
echo -n "→ Aguardando servidor"
for i in $(seq 1 20); do
  sleep 0.4
  if curl -sf "http://localhost:$PORT/" > /dev/null 2>&1; then
    echo " ✓"
    break
  fi
  echo -n "."
done

# ── Abrir browser ─────────────────────────────────────────────────────────────
echo "→ Abrindo http://localhost:$PORT"
open "http://localhost:$PORT" 2>/dev/null || xdg-open "http://localhost:$PORT" 2>/dev/null || true

echo ""
echo "  Dashboard rodando em http://localhost:$PORT"
echo "  Pressione Ctrl+C para encerrar."
echo ""

wait $SERVER_PID
