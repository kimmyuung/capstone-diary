#!/bin/bash
# 개발 환경 PostgreSQL 시작 스크립트 (Linux/Mac)

echo "========================================"
echo "  개발용 PostgreSQL + Redis 시작"
echo "========================================"
echo

# Docker Compose로 DB와 Redis만 실행
docker-compose up -d db redis

echo
echo "[INFO] 서비스 시작 대기 중... (5초)"
sleep 5

# 서비스 상태 확인
docker-compose ps db redis

echo
echo "========================================"
echo "  PostgreSQL 접속 정보"
echo "========================================"
echo "  Host: localhost"
echo "  Port: 5433"
echo "  Database: diary_db"
echo "  User: diary_user"
echo "  Password: diary_password"
echo "========================================"
echo
echo "[TIP] Django에서 사용하려면:"
echo "  1. backend/.env 파일에 다음 추가:"
echo "     export POSTGRES_DB=diary_db"
echo "     export POSTGRES_USER=diary_user"
echo "     export POSTGRES_PASSWORD=diary_password"
echo "     export POSTGRES_HOST=localhost"
echo "     export POSTGRES_PORT=5433"
echo
echo "  2. 마이그레이션 실행:"
echo "     cd backend && python manage.py migrate"
echo
echo "[TIP] 종료하려면: docker-compose stop db redis"
