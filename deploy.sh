#!/usr/bin/env bash
# deploy.sh — envia código para o servidor e reconstrói o Docker
# Uso: ./deploy.sh [mensagem do commit]
#
# Pré-requisito: chave SSH configurada (ver README abaixo)
# Configure as variáveis no arquivo .deploy.env (não commitado)

set -euo pipefail

# ── Carrega variáveis de ambiente do deploy ─────────────────────────────────
DEPLOY_ENV="$(dirname "$0")/.deploy.env"
if [[ ! -f "$DEPLOY_ENV" ]]; then
  echo "❌ Arquivo .deploy.env não encontrado."
  echo "   Copie .deploy.env.example e preencha com seus dados."
  exit 1
fi
# shellcheck source=.deploy.env
source "$DEPLOY_ENV"

# ── Variáveis esperadas em .deploy.env ──────────────────────────────────────
# SSH_HOST=seu.servidor.com.br     (IP ou domínio)
# SSH_USER=root                    (usuário SSH)
# SSH_KEY=~/.ssh/id_venda          (caminho da chave privada)
# REMOTE_DIR=/root/venda-whatsapp-ads
# GIT_BRANCH=main

SSH_HOST="${SSH_HOST:?Defina SSH_HOST no .deploy.env}"
SSH_PORT="${SSH_PORT:-22}"
SSH_USER="${SSH_USER:-root}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_venda}"
REMOTE_DIR="${REMOTE_DIR:-/root/venda-whatsapp-ads}"
GIT_BRANCH="${GIT_BRANCH:-main}"

COMMIT_MSG="${1:-deploy: $(date '+%Y-%m-%d %H:%M')}"

echo "🚀 Deploy — $(date '+%d/%m/%Y %H:%M')"
echo "   Servidor : $SSH_USER@$SSH_HOST"
echo "   Diretório: $REMOTE_DIR"
echo "   Branch   : $GIT_BRANCH"
echo ""

# ── 1. Commit e push local ───────────────────────────────────────────────────
echo "📦 Commitando alterações locais..."
git add -A

if git diff --cached --quiet; then
  echo "   Nada para commitar, seguindo para deploy..."
else
  git commit -m "$COMMIT_MSG"
  echo "   ✅ Commit criado"
fi

echo "⬆️  Enviando para o GitHub..."
git push origin "$GIT_BRANCH"
echo "   ✅ Push concluído"

# ── 2. Deploy no servidor via SSH ────────────────────────────────────────────
echo ""
echo "🖥️  Conectando ao servidor..."

ssh -i "$SSH_KEY" \
    -p "$SSH_PORT" \
    -o StrictHostKeyChecking=accept-new \
    -o ConnectTimeout=15 \
    "$SSH_USER@$SSH_HOST" \
    "
    set -e
    echo '📥 Atualizando código...'
    cd $REMOTE_DIR
    git pull origin $GIT_BRANCH

    echo '🐳 Reconstruindo container...'
    docker compose up --build -d --remove-orphans

    echo '🧹 Limpando imagens antigas...'
    docker image prune -f --filter 'until=24h'

    echo '✅ Deploy concluído!'
    docker compose ps
    "

echo ""
echo "✅ Tudo pronto! Acesse o servidor para verificar os logs:"
echo "   ssh -i $SSH_KEY $SSH_USER@$SSH_HOST 'docker compose logs -f --tail=50'"