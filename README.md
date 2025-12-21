# 📔 감성 일기 (AI Emotion Diary)

> **당신의 하루를 AI가 듣고, 이해하고, 그림으로 그려줍니다.**

사용자가 작성(또는 말한) 일기를 AI가 분석하여 감정을 추출하고, 그날의 기분에 맞는 그림을 그려주는 스마트한 일기장입니다. 웹과 모바일(iOS/Android) 모두를 지원하며, 개인정보는 안전하게 암호화되어 저장됩니다.

---

## ✨ 주요 기능

### 🧠 AI 감정 분석
- **GPT-4o-mini**를 활용하여 8가지 핵심 감정(행복, 슬픔, 화남, 불안, 평온, 신남, 피곤, 사랑)을 분석
- 문맥을 이해하여 정확한 감정 파악

### 🎨 AI 그림 생성
- **DALL-E 3**를 사용하여 일기 내용에 어울리는 감성적인 이미지 자동 생성

### 🎙️ 음성 일기
- **Whisper API**를 통해 말하는 대로 일기가 작성됩니다
- 100개 이상의 언어 지원

### 📋 일기 템플릿
- **8개의 기본 템플릿**: 오늘 하루, 감사 일기, 목표 일기, 주간 회고, 성장 일기, 감정 일기, 여행 일기, 운동 일기
- **AI 템플릿 생성**: 원하는 주제로 맞춤 템플릿 자동 생성
- **플레이스홀더**: `{{날짜}}`, `{{요일}}` 등 자동 치환

### ✨ AI 요약 & 제목 제안
- 일기 내용을 3줄/1줄/불릿으로 요약
- 일기 제목 자동 제안

### 📊 감정 리포트 & 히트맵
- **주간/월간/연간 리포트**: 감정 변화 통계 및 그래프
- **GitHub 잔디 스타일 히트맵**: 연간 일기 작성 및 감정 시각화
- **연속 작성일**: 현재/최장 스트릭 추적

### 🏷️ 태그 & 검색
- 다중 태그로 일기 분류
- 키워드, 기간, 감정, 태그로 검색

### 🔐 프라이버시 중심
- 모든 일기 내용은 **AES-256** 알고리즘으로 암호화
- 오직 본인만이 내용을 복호화 가능

### 📱 크로스 플랫폼
- **React Native (Expo)** 기반으로 웹, iOS, Android 지원
- 다크 모드 / 라이트 모드 지원

---

## 🛠️ 기술 스택

| 구분 | 기술 | 설명 |
|------|------|------|
| **Frontend** | React Native (Expo) | 크로스 플랫폼 앱 개발 |
| | TypeScript | 정적 타입 지원 |
| | Expo Router | 파일 기반 라우팅 |
| **Backend** | Django 5.1 | Python 웹 프레임워크 |
| | Django REST Framework | RESTful API |
| | PostgreSQL | 데이터베이스 |
| **AI Models** | GPT-4o-mini | 감정 분석, 요약, 템플릿 생성 |
| | DALL-E 3 | 이미지 생성 |
| | Whisper-1 | 음성 인식 (STT) |
| **Security** | AES-256 (Fernet) | 데이터 암호화 |
| | JWT | 사용자 인증 |
| | Rate Limiting | API 요청 제한 |
| **Infra** | Docker | 컨테이너화 |
| | GitHub Actions | CI/CD |
| | drf-yasg | Swagger 문서 |

---

## 🚀 시작하기

### 사전 요구사항
- Node.js (v18 이상)
- Python (3.12 이상)
- OpenAI API Key

### 1. 저장소 클론
```bash
git clone https://github.com/kimmyuung/capstone-diary.git
cd capstone-diary
```

### 2. Backend 설정
```bash
cd backend

# 가상환경 생성 및 실행
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# 의존성 설치
pip install -r requirements.txt

# .env 설정
cp .env.example .env
# .env 파일에 OPENAI_API_KEY, SECRET_KEY, DIARY_ENCRYPTION_KEY 입력

# DB 마이그레이션
python manage.py migrate

# 시스템 템플릿 생성
python manage.py create_system_templates

# 서버 실행
python manage.py runserver
```
서버: `http://localhost:8000`

### 3. Frontend 설정
```bash
cd frontend

# 의존성 설치
npm install

# .env 설정 (API_URL=http://localhost:8000)

# 앱 실행
npm run web      # 웹
npm run ios      # iOS
npm run android  # Android
```
웹: `http://localhost:8081`

---

## 📡 API 엔드포인트

### 인증 (8)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register/` | 회원가입 |
| POST | `/api/token/` | 로그인 (JWT) |
| POST | `/api/token/refresh/` | 토큰 갱신 |
| GET | `/api/verify-email/{token}/` | 이메일 인증 |
| POST | `/api/password/reset-request/` | 비밀번호 재설정 요청 |
| POST | `/api/password/reset-confirm/{token}/` | 비밀번호 재설정 확인 |
| POST | `/api/find-username/` | 아이디 찾기 |

### 일기 (12)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/diaries/` | 일기 목록/작성 |
| GET/PUT/DELETE | `/api/diaries/{id}/` | 일기 상세/수정/삭제 |
| GET | `/api/diaries/report/` | 감정 리포트 |
| GET | `/api/diaries/calendar/` | 캘린더 데이터 |
| GET | `/api/diaries/heatmap/` | 감정 히트맵 |
| GET | `/api/diaries/gallery/` | 갤러리 |
| POST | `/api/diaries/{id}/generate-image/` | AI 이미지 생성 |

### 태그 (5)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/tags/` | 태그 목록/생성 |
| GET/PUT/DELETE | `/api/tags/{id}/` | 태그 상세/수정/삭제 |
| GET | `/api/tags/popular/` | 인기 태그 |

### 템플릿 (8)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/templates/` | 템플릿 목록/생성 |
| GET | `/api/templates/system/` | 시스템 템플릿 |
| GET | `/api/templates/my/` | 내 템플릿 |
| POST | `/api/templates/{id}/use/` | 템플릿 사용 |
| POST | `/api/templates/generate/` | AI 템플릿 생성 |
| POST | `/api/templates/save-generated/` | 생성된 템플릿 저장 |

### AI & 설정 (7)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/summarize/` | AI 요약 |
| POST | `/api/suggest-title/` | 제목 제안 |
| POST | `/api/transcribe/` | 음성 → 텍스트 |
| GET/PATCH | `/api/preferences/` | 사용자 설정 |
| GET/PUT | `/api/preferences/theme/` | 테마 설정 |

### API 문서
- Swagger UI: `http://localhost:8000/api/docs/`
- ReDoc: `http://localhost:8000/api/redoc/`

---

## 📊 프로젝트 구조

```
capstone-diary/
├── backend/                    # Django REST API
│   ├── config/                 # 설정
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── throttling.py       # Rate Limiting
│   ├── diary/                  # 메인 앱
│   │   ├── models.py           # Diary, Tag, Template, UserPreference
│   │   ├── views/              # 뷰 모듈
│   │   │   ├── auth_views.py
│   │   │   ├── diary_views.py
│   │   │   ├── tag_views.py
│   │   │   ├── template_views.py
│   │   │   ├── ai_views.py
│   │   │   └── ...
│   │   ├── ai_service.py       # AI 서비스
│   │   ├── emotion_service.py  # 감정 분석
│   │   └── encryption.py       # 암호화
│   └── requirements.txt
│
├── frontend/                   # React Native (Expo)
│   ├── app/                    # 화면
│   │   ├── (tabs)/             # 탭 네비게이션
│   │   └── diary/              # 일기 관련 화면
│   ├── components/             # 컴포넌트
│   │   ├── EmotionHeatmap.tsx
│   │   ├── TagSelector.tsx
│   │   ├── TemplateSelector.tsx
│   │   └── AISummaryPreview.tsx
│   ├── services/api.ts         # API 서비스
│   ├── utils/
│   │   └── templatePlaceholder.ts
│   └── package.json
│
└── README.md
```

---

## 📊 개발 로드맵

- [x] **Phase 1**: MVP (일기 CRUD, 기본 감정 분석)
- [x] **Phase 2**: AI 고도화 (GPT-4o-mini, DALL-E 3, Whisper)
- [x] **Phase 3**: 사용자 경험 (리포트, 음성 입력, UI 개선)
- [x] **Phase 4**: 태그, 템플릿, AI 생성
- [x] **Phase 5**: 히트맵, 설정 동기화, Rate Limiting
- [x] **Phase 6**: 모노레포 통합, Swagger 문서화
- [ ] **Phase 7**: 배포 (Docker, AWS, CI/CD)

---

## 📝 라이선스

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
