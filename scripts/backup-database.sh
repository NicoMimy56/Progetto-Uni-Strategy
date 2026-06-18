#!/bin/sh
# Backup SQLite (eseguire sul Raspberry, es. cron notturno).
# Uso: ./scripts/backup-database.sh /mnt/storage/UniStrategy/Database /mnt/storage/UniStrategy/backups

SRC_DIR="${1:-./Database}"
DEST_DIR="${2:-./backups}"
STAMP="$(date +%Y-%m-%d_%H%M)"

mkdir -p "$DEST_DIR"
if [ -f "$SRC_DIR/unistrategy.db" ]; then
  cp "$SRC_DIR/unistrategy.db" "$DEST_DIR/unistrategy_${STAMP}.db"
  # Mantieni gli ultimi 14 backup
  ls -1t "$DEST_DIR"/unistrategy_*.db 2>/dev/null | tail -n +15 | xargs -r rm --
  echo "Backup OK: $DEST_DIR/unistrategy_${STAMP}.db"
else
  echo "File non trovato: $SRC_DIR/unistrategy.db" >&2
  exit 1
fi
