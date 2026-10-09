#!/bin/sh
# ═══════════════════════════════════════════════════════════════════
# Backup do banco MODO·RIR (PostgreSQL no Docker) — Linux/Mac/Git Bash
# Uso:  sh scripts/backup.sh
# Agende no cron (ex.: 0 23 * * *  cd /caminho/projeto && sh scripts/backup.sh)
# ═══════════════════════════════════════════════════════════════════
set -e
DIR="$(dirname "$0")/../backups"
mkdir -p "$DIR"
STAMP=$(date +%Y-%m-%d_%H%M)
OUT="$DIR/modorir_$STAMP.sql"
echo "Gerando backup em $OUT ..."
docker exec modorir-postgres pg_dump -U modorir -d modorir --clean --if-exists > "$OUT"
gzip -f "$OUT"
echo "Backup concluido: $OUT.gz"
# Mantém apenas os 30 mais recentes
ls -1t "$DIR"/modorir_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm -f
