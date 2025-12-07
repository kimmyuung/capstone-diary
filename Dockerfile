FROM python:3.11-slim

# 환경 변수 설정
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 업데이트
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
COPY requirements.txt /app/
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# 프로젝트 파일 복사
COPY . /app/

# Static 파일 수집
RUN python manage.py collectstatic --noinput

# 포트 노출
EXPOSE 8000

# Gunicorn 실행
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "config.wsgi:application"]