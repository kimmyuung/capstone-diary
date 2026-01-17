# 개발 환경 PostgreSQL 설정 가이드

## 빠른 시작

### 1. Docker로 PostgreSQL 실행
```bash
# Windows
start-dev-db.bat

# Linux/Mac
./start-dev-db.sh
```

### 2. .env 파일에 PostgreSQL 설정 추가
```env
# backend/.env 파일에 추가
POSTGRES_DB=diary_db
POSTGRES_USER=diary_user
POSTGRES_PASSWORD=diary_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
```

### 3. 마이그레이션 실행
```bash
cd backend
python manage.py migrate
```

---

## 수동 설정

### Docker Compose로 DB만 실행
```bash
docker-compose up -d db redis
```

### 접속 정보
| 항목 | 값 |
|------|-----|
| Host | localhost |
| Port | 5433 |
| Database | diary_db |
| User | diary_user |
| Password | diary_password |

### pgAdmin 또는 DBeaver로 접속
```
postgresql://diary_user:diary_password@localhost:5433/diary_db
```

---

## SQLite vs PostgreSQL

| 환경 변수 | 사용 DB |
|----------|---------|
| `POSTGRES_DB` 설정됨 | PostgreSQL |
| `POSTGRES_DB` 없음 | SQLite (기본값) |

### SQLite로 전환하려면
`.env` 파일에서 `POSTGRES_*` 변수를 삭제하면 자동으로 SQLite 사용

---

## pgvector 기능

PostgreSQL 환경에서는 다음 기능이 활성화됩니다:
- ✅ 벡터 유사도 검색 (RAG 챗봇)
- ✅ HNSW 인덱스
- ✅ 하이브리드 검색 (벡터 + 키워드)

SQLite에서는 키워드 검색으로 Fallback 됩니다.

---

## 서비스 종료
```bash
docker-compose stop db redis
```

## 데이터 초기화
```bash
docker-compose down -v  # 볼륨 포함 삭제
```
