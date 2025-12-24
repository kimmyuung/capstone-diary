#!/bin/bash
# =============================================================================
# PostgreSQL 데이터베이스 백업 스크립트
# 사용법: ./backup-db.sh
# Cron 예시: 0 2 * * * /path/to/backup-db.sh >> /var/log/db-backup.log 2>&1
# =============================================================================

set -e

# 설정
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/diary_backup_${TIMESTAMP}.sql.gz"

# 환경 변수 확인
if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$POSTGRES_DB" ]; then
    echo "❌ Error: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB 환경 변수가 필요합니다."
    exit 1
fi

# 백업 디렉토리 생성
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting database backup at $(date)"
echo "   Database: $POSTGRES_DB"
echo "   Target: $BACKUP_FILE"

# 백업 실행
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    -h "${POSTGRES_HOST:-db}" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --no-owner \
    --no-acl \
    | gzip > "$BACKUP_FILE"

# 백업 파일 크기 확인
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup completed: $BACKUP_FILE ($BACKUP_SIZE)"

# 오래된 백업 삭제
echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "diary_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# 남은 백업 수 확인
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/diary_backup_*.sql.gz 2>/dev/null | wc -l)
echo "📊 Remaining backups: $BACKUP_COUNT"

echo "🎉 Backup process completed successfully at $(date)"
