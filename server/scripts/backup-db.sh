#!/bin/bash
# ─────────────────────────────────────────────────
# LMS Platform — Database Backup Script (MongoDB)
# 
# Usage:
#   ./scripts/backup-db.sh                    # Full backup
#
# Cron example (daily at 2 AM):
#   0 2 * * * /path/to/lms-platform/server/scripts/backup-db.sh >> /var/log/lms-backup.log 2>&1
# ─────────────────────────────────────────────────

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/lms}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/lms_backup_${TIMESTAMP}.archive.gz"

# Load environment
if [ -f "$(dirname "$0")/../.env" ]; then
  export $(grep -v '^#' "$(dirname "$0")/../.env" | xargs)
fi

DB_URL="${DATABASE_URL:-}"

if [ -z "$DB_URL" ]; then
  echo "[ERROR] DATABASE_URL not set. Cannot backup."
  exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting MongoDB backup..."

# Run mongodump and compress
mongodump --uri="$DB_URL" --archive="$BACKUP_FILE" --gzip

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup completed: $BACKUP_FILE ($FILESIZE)"

# Clean up old backups
echo "[$(date)] Cleaning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "lms_backup_*.archive.gz" -mtime +${RETENTION_DAYS} -delete

REMAINING=$(ls -1 "$BACKUP_DIR"/lms_backup_*.archive.gz 2>/dev/null | wc -l)
echo "[$(date)] Backup complete. ${REMAINING} backup(s) retained."
