# 시스템 아키텍처 (System Architecture)

## 1. 개요 (Overview)
**AI 감성 일기(AI Emotion Diary)** 플랫폼은 실시간 사용자 상호작용과 비동기 AI 처리를 처리할 수 있도록 설계된 현대적이고 확장 가능한 아키텍처를 기반으로 합니다. 사용자 인터페이스(Frontend)와 비즈니스 로직(Backend)을 분리하고, 데이터 저장, 캐싱, 백그라운드 작업 처리를 위한 전문화된 서비스를 활용합니다.

## 2. 인프라 다이어그램 (Infrastructure Diagram)

```mermaid
graph TD
    %% User Layer
    User[👤 사용자] --> ClientApp[📱 프론트엔드 모바일 앱<br/>(React Native / Expo)]

    %% API Layer
    subgraph "백엔드 인프라 (Docker)"
        WSGI[🌐 Django API 서버<br/>(Gunicorn / REST Framework)]
        Worker[⚙️ Celery 워커<br/>(비동기 작업 처리)]
        
        %% Data Layer
        DB[(🗄️ PostgreSQL<br/>+ pgvector)]
        Redis[(⚡ Redis<br/>캐시 & 브로커)]
        
        %% Internal Connections
        WSGI -->|데이터 읽기/쓰기| DB
        WSGI -->|캐시 & 작업 요청| Redis
        Redis -->|작업 가져오기| Worker
        Worker -->|결과 저장| DB
    end
    
    %% Communication
    ClientApp -->|HTTP/HTTPS (JSON)| WSGI
    
    %% External Services
    subgraph "외부 서비스"
        Gemini[🤖 Google Gemini API<br/>(LLM & 비전)]
        OpenAI[🧠 OpenAI API<br/>(Whisper / GPT)]
        Sentry[🚨 Sentry<br/>(에러 모니터링)]
        SMTP[📧 이메일 서비스<br/>(SMTP)]
    end
    
    %% External Connections
    WSGI -->|에러 로그| Sentry
    Worker -->|콘텐츠 생성| Gemini
    Worker -->|음성 텍스트 변환| OpenAI
    Worker -->|이메일 전송| SMTP
```

## 3. 컴포넌트 상세 (Component Details)

### 📱 프론트엔드 (Client)
- **기술 스택**: React Native, Expo, TypeScript, Expo Router.
- **역할**: 사용자 인터페이스, 입력 (음성/텍스트), 상태 관리 (React Context), API 통신 (Axios).
- **주요 기능**: 오프라인 큐, 생체 인증, 낙관적 UI 업데이트.

### 🌐 백엔드 API (Server)
- **기술 스택**: Python, Django 6.0, Django REST Framework.
- **역할**: 인증 (JWT), 비즈니스 로직, 데이터 유효성 검사, API 엔드포인트 제공.
- **보안**: 속도 제한(Throttling), CORS 정책, 사용자 데이터 암호화.

### ⚙️ 비동기 워커 (Celery)
- **기술 스택**: Celery.
- **역할**: API 응답성을 유지하기 위해 시간이 오래 걸리는 작업을 백그라운드에서 처리.
- **주요 작업**:
    - AI 콘텐츠 생성 (요약, 코멘트, 그림 프롬프트).
    - AI 그림 생성.
    - 이메일 전송.
    - PDF 리포트 생성.

### 🗄️ 데이터베이스 (PostgreSQL)
- **특징**: `pgvector` 확장이 설치됨.
- **역할**: 사용자, 일기, 리포트 등의 영구 데이터 저장.
- **벡터 검색**: 일기 내용의 의미 기반 검색(Semantic Search) 지원 (계획/지원됨).

### ⚡ 캐시 & 메시지 브로커 (Redis)
- **역할**:
    - **브로커**: Celery 작업을 위한 큐 역할.
    - **캐시**: 빈번한 API 응답 캐싱 (예: 리포트, 캘린더).
    - **속도 제한(Throttling)**: API 사용량 추적.

## 4. 주요 흐름 (Key Workflows)

### 📝 일기 작성 및 AI 분석
1.  **사용자**가 앱을 통해 일기(텍스트/음성)를 제출합니다.
2.  **API**가 원본 일기를 **PostgreSQL**에 저장합니다.
3.  **API**가 분석 작업을 **Redis** 큐에 넣습니다.
4.  **API**는 사용자에게 즉시 "저장됨" 응답을 보냅니다 (사용자 대기 시간 최소화).
5.  **Celery 워커**가 큐에서 작업을 가져옵니다.
6.  **워커**가 **Gemini/OpenAI**를 호출하여 감정 분석 및 요약을 수행합니다.
7.  **워커**가 분석 결과를 **PostgreSQL**의 일기 데이터에 업데이트합니다.
8.  **앱**은 알림을 받거나 폴링(Polling)을 통해 업데이트된 분석 결과를 확인합니다.
