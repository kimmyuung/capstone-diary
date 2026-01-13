# =============================================================================
# AI 감성 일기 - Backend Dockerfile
# =============================================================================
FROM python:3.12-slim

# 환경 변수 설정
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# 작업 디렉토리 설정
WORKDIR /app

# Hugging Face 캐시 디렉토리 설정 (빌드 오류 방지)
ENV HF_HOME=/app/cache/huggingface
RUN mkdir -p /app/cache/huggingface

# 시스템 패키지 업데이트 및 필수 패키지 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Python 패키지 설치 (레이어 캐싱 최적화)
# Python 패키지 설치 (레이어 캐싱 최적화)
# 1. 무거운 AI 의존성 먼저 설치 (변경이 적음)
COPY requirements-ai.txt /app/
RUN pip install --upgrade pip \
    && pip install -r requirements-ai.txt

# 2. 일반 의존성 설치 (변경이 잦음)
# 2. 일반 의존성 설치 (변경이 잦음)
COPY requirements.txt /app/
COPY requirements-dev.txt /app/
RUN pip install -r requirements.txt \
    && pip install -r requirements-dev.txt \
    && pip install gunicorn

# 프로젝트 파일 복사
COPY . /app/

# 비루트 사용자 생성 (보안)
RUN addgroup --system --gid 1001 appgroup \
    && adduser --system --uid 1001 --gid 1001 appuser \
    && chown -R appuser:appgroup /app
USER appuser

# Static 파일 수집
RUN python manage.py collectstatic --noinput

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

# 포트 노출
EXPOSE 8000

# Gunicorn 실행 (워커 수 최적화)
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "--threads", "2", "--timeout", "120", "config.wsgi:application"]