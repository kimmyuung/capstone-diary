# =============================================================================
# AI 감성 일기 - Frontend Dockerfile (React Native Web)
# =============================================================================
# 빌드 스테이지
FROM node:20-alpine AS builder

WORKDIR /app

# 패키지 파일 복사 및 의존성 설치
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# 소스 코드 복사
COPY . .

# 환경 변수 설정 (빌드 시점)
ARG API_URL=http://localhost:8000
ENV EXPO_PUBLIC_API_URL=$API_URL

# Expo Web 빌드
RUN npx expo export --platform web

# =============================================================================
# 프로덕션 스테이지 (Nginx)
# =============================================================================
FROM nginx:alpine

# Nginx 설정 복사
COPY nginx.conf /etc/nginx/nginx.conf

# 빌드된 정적 파일 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
