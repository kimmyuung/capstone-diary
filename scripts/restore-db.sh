#!/bin/bash
# =============================================================================
# PostgreSQL 데이터베이스 복원 스크립트
# 사용법: ./restore-db.sh <backup_file.sql.gz>
# =============================================================================

set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "❌ Usage: $0 <backup_file.sql.gz>"
    echo "   Available backups:"
    ls -la /backups/diary_backup_*.sql.gz 2>/dev/null || echo "   (No backups found)"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# 환경 변수 확인
if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$POSTGRES_DB" ]; then
    echo "❌ Error: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB 환경 변수가 필요합니다."
    exit 1
fi

echo "⚠️  WARNING: 기존 데이터가 모두 삭제됩니다!"
echo "   Database: $POSTGRES_DB"
echo "   Backup: $BACKUP_FILE"
read -p "계속하시겠습니까? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Cancelled."
    exit 1
fi

echo "🔄 Starting database restore at $(date)"

# 기존 연결 종료 및 DB 재생성
echo "📦 Dropping and recreating database..."
PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "${POSTGRES_HOST:-db}" \
    -U "$POSTGRES_USER" \
    -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB';" \
    -c "DROP DATABASE IF EXISTS $POSTGRES_DB;" \
    -c "CREATE DATABASE $POSTGRES_DB;"

# 복원 실행
echo "🔄 Restoring from backup..."
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$POSTGRES_PASSWORD" psql \
    -h "${POSTGRES_HOST:-db}" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --quiet

echo "✅ Database restored successfully at $(date)"
echo "🔔 마이그레이션 실행을 권장합니다: python manage.py migrate"
