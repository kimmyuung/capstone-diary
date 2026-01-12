# 🚀 배포 가이드 (Deployment Guide)

> AI 감성 일기 앱을 AWS EC2 또는 기타 클라우드 서비스에 배포하는 가이드입니다.

---

## 📋 목차

1. [사전 요구사항](#사전-요구사항)
2. [서버 초기 설정](#서버-초기-설정)
3. [배포 과정](#배포-과정)
4. [SSL 인증서 설정](#ssl-인증서-설정)
5. [데이터베이스 백업](#데이터베이스-백업)
6. [모니터링](#모니터링)
7. [문제 해결](#문제-해결)

---

## 📋 사전 요구사항

### 서버 요구사항
| 항목 | 최소 사양 | 권장 사양 |
|------|----------|----------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 2GB | 4GB |
| Storage | 20GB SSD | 50GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### 필수 소프트웨어
- Docker (v24.0+)
- Docker Compose (v2.0+)
- Git

### 필요한 계정/키
- Google Gemini API Key (필수 - AI 요약/이미지)
- OpenAI API Key (선택 - Fallback/감정분석)
- 도메인 및 DNS 설정
- (선택) Sentry DSN (에러 추적)
- (선택) AWS S3 (미디어 저장)

---

## 🖥️ 서버 초기 설정

### 1. AWS EC2 인스턴스 생성
```bash
# 권장 AMI: Ubuntu Server 22.04 LTS
# 인스턴스 유형: t3.medium (테스트) / t3.large (프로덕션)
# 보안 그룹:
#   - SSH (22): 내 IP
#   - HTTP (80): 0.0.0.0/0
#   - HTTPS (443): 0.0.0.0/0
```

### 2. 서버 기본 설정
```bash
# SSH 접속
ssh -i your-key.pem ubuntu@your-ec2-ip

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y curl git vim htop

# 타임존 설정
sudo timedatectl set-timezone Asia/Seoul
```

### 3. Docker 설치
```bash
# Docker 설치 (공식 스크립트)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 새 세션 시작 (또는 로그아웃 후 재접속)
newgrp docker

# Docker Compose 설치
sudo apt install docker-compose-plugin

# 설치 확인
docker --version
docker compose version
```

### 4. 방화벽 설정
```bash
# UFW 활성화
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

## 🚀 배포 과정

### 1. 소스 코드 클론
```bash
# 앱 디렉토리 생성
mkdir -p ~/app && cd ~/app

# Git 클론
git clone https://github.com/kimmyuung/capstone-diary.git .
```

### 2. 환경 변수 설정
```bash
# 프로덕션 환경 파일 복사
cp backend/.env.production.example .env

# 환경 변수 편집
vim .env
```

**필수 환경 변수:**
```env
# Django (필수)
DEBUG=False
SECRET_KEY=your-super-secret-key-at-least-50-characters-long

# Database (필수)
POSTGRES_DB=diary_db
POSTGRES_USER=diary_user
POSTGRES_PASSWORD=your-strong-database-password

# Encryption (필수)
# 생성: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
DIARY_ENCRYPTION_KEY=your-fernet-encryption-key

# Google Gemini (필수 - AI 요약/이미지)
GEMINI_API_KEY=AIza...
GEMINI_TEXT_MODEL=gemini-3-flash-preview

# OpenAI (선택 - Fallback/감정분석)
OPENAI_API_KEY=sk-your-openai-api-key

# 도메인 설정 (필수)
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
API_URL=https://api.your-domain.com

# Sentry (선택)
SENTRY_DSN=https://your-sentry-dsn
```

### 3. Docker 이미지 빌드
```bash
# 백엔드 빌드
docker compose -f docker-compose.prod.yml build backend

# 프론트엔드 빌드
docker compose -f docker-compose.prod.yml build frontend

# 또는 전체 빌드
docker compose -f docker-compose.prod.yml build
```

### 4. 서비스 시작
```bash
# 서비스 시작 (백그라운드)
docker compose -f docker-compose.prod.yml up -d

# 로그 확인
docker compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker compose -f docker-compose.prod.yml logs -f backend
```

### 5. 데이터베이스 마이그레이션
```bash
# 마이그레이션 실행
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# 관리자 계정 생성
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# 시스템 템플릿 생성
docker compose -f docker-compose.prod.yml exec backend python manage.py create_system_templates
```

### 6. 상태 확인
```bash
# 컨테이너 상태
docker compose -f docker-compose.prod.yml ps

# 헬스 체크
curl http://localhost:80/api/health/
```

---

## 🔐 SSL 인증서 설정

### Let's Encrypt 자동 발급
```bash
# SSL 초기화 스크립트 실행
chmod +x scripts/init-ssl.sh
./scripts/init-ssl.sh your-domain.com admin@your-domain.com
```

### 수동 설정 (이미 인증서가 있는 경우)
```bash
# 인증서 디렉토리 생성
mkdir -p nginx/ssl

# 인증서 파일 복사
cp /path/to/fullchain.pem nginx/ssl/
cp /path/to/privkey.pem nginx/ssl/

# Nginx 재시작
docker compose -f docker-compose.prod.yml restart nginx
```

### 인증서 갱신 확인
```bash
# Certbot 컨테이너가 자동으로 12시간마다 갱신 체크합니다
docker compose -f docker-compose.prod.yml logs certbot
```

---

## 💾 데이터베이스 백업

### 자동 백업 설정 (Cron)
```bash
# 백업 스크립트 실행 권한
chmod +x scripts/backup-db.sh

# Cron 설정 (매일 새벽 2시)
crontab -e
# 다음 줄 추가:
# 0 2 * * * cd /home/ubuntu/app && docker compose -f docker-compose.prod.yml exec -T db /backups/backup-db.sh >> /var/log/db-backup.log 2>&1
```

### 수동 백업
```bash
# 백업 실행
docker compose -f docker-compose.prod.yml exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 백업 복원
```bash
# 복원 스크립트 사용
chmod +x scripts/restore-db.sh
./scripts/restore-db.sh /path/to/backup.sql.gz
```

---

## 📊 모니터링

### 서비스 상태 확인
```bash
# 모든 컨테이너 상태
docker compose -f docker-compose.prod.yml ps

# 리소스 사용량
docker stats

# 디스크 사용량
df -h
```

### 로그 확인
```bash
# 전체 로그
docker compose -f docker-compose.prod.yml logs -f

# 최근 100줄
docker compose -f docker-compose.prod.yml logs --tail=100

# 특정 서비스 로그
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs nginx
docker compose -f docker-compose.prod.yml logs celery
```

### Sentry 설정 (선택)
1. [Sentry](https://sentry.io) 계정 생성
2. 프로젝트 생성 (Django)
3. DSN을 `.env`에 추가:
   ```env
   SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
   ```

---

## 🔧 문제 해결

### 컨테이너가 시작되지 않음
```bash
# 로그 확인
docker compose -f docker-compose.prod.yml logs <service-name>

# 컨테이너 재시작
docker compose -f docker-compose.prod.yml restart <service-name>
```

### 데이터베이스 연결 오류
```bash
# DB 컨테이너 상태 확인
docker compose -f docker-compose.prod.yml exec db pg_isready

# 환경 변수 확인
docker compose -f docker-compose.prod.yml exec backend env | grep DATABASE
```

### Nginx 502 Bad Gateway
```bash
# 백엔드 상태 확인
docker compose -f docker-compose.prod.yml logs backend

# Nginx 로그 확인
docker compose -f docker-compose.prod.yml logs nginx
```

### 디스크 공간 부족
```bash
# Docker 정리
docker system prune -a --volumes

# 오래된 로그 삭제
truncate -s 0 /var/log/*.log
```

### 서비스 재배포
```bash
# 코드 업데이트
git pull origin main

# 재빌드 및 재시작
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# 마이그레이션 (필요 시)
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

---

## 📝 유용한 명령어

```bash
# 서비스 시작/중지
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml down

# 특정 서비스만 재시작
docker compose -f docker-compose.prod.yml restart backend

# 쉘 접속
docker compose -f docker-compose.prod.yml exec backend bash
docker compose -f docker-compose.prod.yml exec db psql -U $POSTGRES_USER -d $POSTGRES_DB

# 로그 실시간 보기
docker compose -f docker-compose.prod.yml logs -f --tail=100

# 이미지/컨테이너 정리
docker system prune -f
```

---

## 📌 체크리스트

배포 전 확인사항:

- [ ] `.env` 파일의 모든 필수 환경 변수 설정
- [ ] `DIARY_ENCRYPTION_KEY` 안전하게 백업
- [ ] DNS 설정 완료 (도메인 → EC2 IP)
- [ ] 보안 그룹 포트 개방 (80, 443)
- [ ] 데이터베이스 백업 Cron 설정
- [ ] SSL 인증서 발급 완료
- [ ] 관리자 계정 생성
- [ ] 시스템 템플릿 생성
- [ ] 헬스체크 정상 확인

---

## 🆘 지원

문제가 발생하면:
1. [GitHub Issues](https://github.com/kimmyuung/capstone-diary/issues)
2. 로그 확인: `docker compose logs`
3. Sentry 에러 추적 확인
