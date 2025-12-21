# AWS EC2 배포 가이드

AI 기반 감성 일기 앱을 AWS EC2에 Docker로 배포하는 방법입니다.

## 📋 사전 준비

### 1. AWS 계정 설정
- AWS 계정 생성
- IAM 사용자 생성 (EC2, S3 권한)
- EC2 Key Pair 생성 및 다운로드

### 2. 필요한 정보
- OpenAI API Key
- 도메인 (선택사항)

## 🖥️ EC2 인스턴스 생성

### 1. 인스턴스 설정
- **AMI**: Ubuntu Server 22.04 LTS
- **인스턴스 유형**: t3.small 이상 권장 (t2.micro도 가능하나 Swap 필요)
- **스토리지**: 20GB 이상

### 2. 보안 그룹 설정
| 유형 | 포트 | 소스 | 설명 |
|------|------|------|------|
| SSH | 22 | 내 IP | 서버 접속 |
| HTTP | 80 | 0.0.0.0/0 | 웹 서비스 |
| HTTPS | 443 | 0.0.0.0/0 | 보안 웹 서비스 |

### 3. 탄력적 IP 할당
고정 IP를 위해 탄력적 IP를 생성하고 인스턴스에 연결합니다.

## 🚀 배포 단계

### 1. EC2 접속
```bash
ssh -i "your-key.pem" ubuntu@your-ec2-ip
```

### 2. 초기 설정 스크립트 실행
```bash
# 프로젝트 클론
git clone https://github.com/kimmyuung/diary-backend.git
cd diary-backend/backend

# 초기 설정 (Docker, 방화벽 등)
chmod +x scripts/ec2-setup.sh
./scripts/ec2-setup.sh

# 로그아웃 후 다시 접속 (docker 그룹 적용)
exit
ssh -i "your-key.pem" ubuntu@your-ec2-ip
```

### 3. 환경 변수 설정
```bash
cd diary-backend/backend

# 환경 변수 파일 생성
cp .env.production.example .env

# 환경 변수 편집
nano .env
```

**.env 파일 설정:**
```env
DEBUG=False
SECRET_KEY=your-secure-random-key
ALLOWED_HOSTS=your-domain.com,your-ec2-ip

POSTGRES_DB=diary_db
POSTGRES_USER=diary_user
POSTGRES_PASSWORD=your-strong-password

OPENAI_API_KEY=sk-your-openai-key

CORS_ALLOWED_ORIGINS=https://your-domain.com
```

### 4. 배포 실행
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## 🔐 SSL 인증서 설정 (HTTPS)

### Let's Encrypt 무료 SSL
```bash
# Certbot 설치
sudo apt-get install certbot

# 인증서 발급 (nginx 중지 후)
docker-compose -f docker-compose.prod.yml stop nginx
sudo certbot certonly --standalone -d your-domain.com

# 인증서 복사
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ~/app/nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ~/app/nginx/ssl/

# nginx.conf에서 HTTPS 설정 활성화 후 재시작
docker-compose -f docker-compose.prod.yml up -d nginx
```

### 인증서 자동 갱신
```bash
# crontab에 추가
sudo crontab -e

# 매월 1일 새벽 3시에 갱신
0 3 1 * * certbot renew --quiet && docker-compose -f /home/ubuntu/app/docker-compose.prod.yml restart nginx
```

## 📊 모니터링

### 로그 확인
```bash
# 모든 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f web
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### 상태 확인
```bash
# 컨테이너 상태
docker-compose -f docker-compose.prod.yml ps

# 리소스 사용량
docker stats
```

## 🔄 업데이트 배포

### 자동 배포 (GitHub Actions)
main 브랜치에 push하면 자동으로 배포됩니다.

**필요한 GitHub Secrets:**
| Secret 이름 | 설명 |
|-------------|------|
| EC2_HOST | EC2 탄력적 IP |
| EC2_USER | ubuntu |
| EC2_SSH_KEY | .pem 파일 내용 |

### 수동 배포
```bash
cd ~/app/diary-backend/backend
git pull origin main
./scripts/deploy.sh
```

## 🛠️ 문제 해결

### 컨테이너 재시작
```bash
docker-compose -f docker-compose.prod.yml restart
```

### 데이터베이스 백업
```bash
# 백업
docker-compose -f docker-compose.prod.yml exec db pg_dump -U diary_user diary_db > backup.sql

# 복원
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T db psql -U diary_user diary_db
```

### 디스크 공간 정리
```bash
docker system prune -a
```

## 💰 예상 비용 (월간)

| 서비스 | 사양 | 예상 비용 |
|--------|------|-----------|
| EC2 t3.small | 2 vCPU, 2GB RAM | ~$15 |
| EBS 20GB | SSD | ~$2 |
| 탄력적 IP | 고정 IP | $0 (사용 중) |
| 데이터 전송 | 100GB | ~$9 |
| **합계** | | **~$26/월** |

> 💡 **프리 티어 활용**: 신규 AWS 계정은 12개월간 t2.micro 무료 사용 가능

## 📚 추가 자료

- [AWS EC2 공식 문서](https://docs.aws.amazon.com/ec2/)
- [Docker 공식 문서](https://docs.docker.com/)
- [Django 배포 체크리스트](https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/)
