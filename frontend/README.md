# 📔 AI 감성 일기 모바일 앱 (Diary-Frontend)

<div align="center">

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**사용자의 감정을 이해하고 공감하는 AI 기반 디지털 일기장**

[데모 보기](#) · [버그 리포트](https://github.com/kimmyuung/diary-frontend/issues) · [기능 제안](https://github.com/kimmyuung/diary-frontend/issues)

</div>

---

## ✨ 프로젝트 소개

**AI 감성 일기**는 사용자가 작성한 일기를 실시간으로 분석하여 감정 상태를 파악하고, 맞춤형 피드백을 제공하는 모바일 애플리케이션입니다. React Native와 Expo를 활용하여 iOS 및 Android 플랫폼을 모두 지원합니다.

### 🎯 핵심 가치

- **감정 인식**: AI 기반 텍스트 분석으로 사용자의 감정 상태를 정확하게 파악
- **실시간 피드백**: 일기 작성 즉시 감정 분석 결과를 시각적으로 제공
- **개인화된 응답**: AI 챗봇이 분석된 감정에 맞춰 위로와 격려 메시지 제공
- **감정 추적**: 시간에 따른 감정 변화를 그래프로 시각화하여 자기 성찰 지원

---

## 🎨 주요 기능

### 1. 📝 직관적인 일기 작성
- 깔끔하고 집중할 수 있는 텍스트 에디터
- 날짜/시간 자동 기록
- 이미지 첨부 기능 (선택 사항)
- 실시간 자동 저장

### 2. 🧠 AI 감성 분석
- 작성한 일기의 감정 자동 분석
- 다차원 감정 분류 (기쁨, 슬픔, 분노, 불안, 평온 등)
- 감정 강도 점수화 및 시각화
- 키워드 추출 및 감정 트리거 분석

### 3. 💬 AI 챗봇 대화
- 감정 상태에 기반한 맞춤형 대화
- 공감 및 격려 메시지 제공
- 심리적 지원 및 긍정적 사고 유도
- 자연스러운 대화형 인터페이스

### 4. 📊 감정 히스토리 & 통계
- 월별/주별 감정 추이 그래프
- 캘린더 뷰에서 감정 이모지 표시
- 가장 빈번한 감정 패턴 분석
- 감정 변화 인사이트 제공

### 5. 🎨 사용자 경험 최적화
- 다크모드 지원
- 부드러운 애니메이션 및 전환 효과
- 오프라인 모드 (로컬 저장)
- 반응형 디자인

---

## 🛠️ 기술 스택

### Frontend Framework
- **React Native** - 크로스 플랫폼 모바일 개발
- **Expo** - 빠른 개발 및 배포 프레임워크
- **TypeScript** (85.1%) - 타입 안정성 확보
- **JavaScript** (14.9%)

### 주요 라이브러리
- **React Navigation** - 화면 네비게이션
- **Axios** - HTTP 클라이언트
- **React Hooks** - 상태 관리
- **AsyncStorage** - 로컬 데이터 저장

### 예상 UI/차트 라이브러리
- **react-native-chart-kit** - 감정 데이터 시각화
- **react-native-calendars** - 캘린더 뷰
- **react-native-svg** - 벡터 그래픽

### 개발 도구
- **EAS Build** - 클라우드 빌드 및 배포
- **ESLint** - 코드 품질 관리
- **Prettier** - 코드 포맷팅

---

## 📁 프로젝트 구조

```
diary-frontend/
├── app/                    # 앱 화면 및 라우팅
│   ├── (auth)/            # 인증 관련 화면
│   ├── (tabs)/            # 탭 네비게이션 화면
│   └── index.tsx          # 앱 진입점
├── assets/                 # 정적 리소스
│   └── images/            # 이미지 파일
├── components/             # 재사용 가능한 컴포넌트
│   ├── common/            # 공통 컴포넌트 (Button, Input 등)
│   ├── diary/             # 일기 관련 컴포넌트
│   ├── chart/             # 차트 컴포넌트
│   └── chatbot/           # 챗봇 UI 컴포넌트
├── constants/              # 상수 정의
│   ├── Colors.ts          # 색상 테마
│   ├── Config.ts          # API URL 등 설정
│   └── Types.ts           # TypeScript 타입 정의
├── hooks/                  # 커스텀 Hooks
│   ├── useDiary.ts        # 일기 관련 로직
│   ├── useEmotion.ts      # 감정 분석 로직
│   └── useAuth.ts         # 인증 로직
├── scripts/                # 빌드/배포 스크립트
├── .vscode/                # VSCode 설정
├── App.js                  # 메인 앱 컴포넌트
├── app.json                # Expo 앱 설정
├── eas.json                # EAS Build 설정
├── package.json            # 의존성 관리
└── tsconfig.json           # TypeScript 설정
```

---

## 🚀 시작하기

### 사전 요구사항

- Node.js 18+ 설치
- npm 또는 yarn 패키지 매니저
- Expo CLI 설치
- iOS 시뮬레이터 (Mac) 또는 Android 에뮬레이터

### 설치 방법

1. **저장소 클론**
```bash
git clone https://github.com/kimmyuung/diary-frontend.git
cd diary-frontend
```

2. **의존성 설치**
```bash
npm install
# 또는
yarn install
```

3. **환경 변수 설정**
```bash
# .env 파일 생성
cp .env.example .env

# API 엔드포인트 설정
EXPO_PUBLIC_API_URL=https://your-backend-api.com
EXPO_PUBLIC_AI_API_URL=https://your-ai-service.com
```

4. **개발 서버 실행**
```bash
npx expo start
```

5. **플랫폼별 실행**
```bash
# iOS 시뮬레이터
npx expo run:ios

# Android 에뮬레이터
npx expo run:android

# Expo Go 앱으로 실행 (물리적 디바이스)
# QR 코드 스캔하여 실행
```

---

## 📱 주요 화면

### 1. 로그인 / 회원가입
- 이메일/소셜 로그인 지원
- 간편한 회원가입 프로세스

### 2. 홈 (일기 목록)
- 최근 작성한 일기 카드 리스트
- 날짜별 감정 이모지 표시
- 검색 및 필터링 기능

### 3. 일기 작성
- 텍스트 에디터
- 이미지 첨부
- 실시간 감정 분석 프리뷰

### 4. 일기 상세
- 작성한 일기 내용
- AI 감정 분석 결과 시각화
- 감정별 키워드 하이라이트

### 5. AI 챗봇
- 대화형 인터페이스
- 감정 기반 맞춤 응답
- 채팅 히스토리 저장

### 6. 통계 대시보드
- 월별/주별 감정 추이 그래프
- 감정 분포 파이 차트
- 감정 변화 인사이트

### 7. 설정
- 프로필 관리
- 알림 설정
- 다크모드 전환
- 데이터 백업/복원

---

## 🏗️ 아키텍처

### 클라이언트-서버 구조

```
┌─────────────────────┐
│  React Native App   │
│   (TypeScript)      │
└──────────┬──────────┘
           │ Axios HTTP
           ↓
┌─────────────────────┐
│   Backend API       │
│   (Spring Boot)     │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   AI/ML Service     │
│   (Python/PyTorch)  │
└─────────────────────┘
```

### 데이터 흐름

1. **일기 작성** → 로컬 임시 저장 (AsyncStorage)
2. **저장 요청** → 백엔드 API 전송
3. **감정 분석** → AI 모델 호출
4. **결과 수신** → UI 업데이트 (애니메이션)
5. **로컬 동기화** → 오프라인 지원

---

## 🧪 테스트

```bash
# 유닛 테스트 실행
npm test

# 테스트 커버리지
npm run test:coverage

# E2E 테스트 (Detox)
npm run test:e2e
```

---

## 📦 빌드 및 배포

### Development 빌드
```bash
eas build --profile development --platform all
```

### Preview 빌드
```bash
eas build --profile preview --platform all
```

### Production 빌드
```bash
eas build --profile production --platform all
```

### 앱 스토어 제출
```bash
# iOS
eas submit --platform ios

# Android
eas submit --platform android
```

---

## 🤝 기여하기

프로젝트에 기여하고 싶으시다면 다음 단계를 따라주세요:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 코드 컨벤션
- TypeScript 사용
- ESLint 규칙 준수
- Prettier로 포맷팅
- 의미있는 커밋 메시지 작성

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

## 👥 개발자

**Kim Myung** - [@kimmyuung](https://github.com/kimmyuung)

프로젝트 링크: [https://github.com/kimmyuung/diary-frontend](https://github.com/kimmyuung/diary-frontend)

---

## 🙏 감사의 글

- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- AI 모델 제공: [Backend API Service]

---

## 📞 문의 및 지원

- 이슈 트래커: [GitHub Issues](https://github.com/kimmyuung/diary-frontend/issues)
- 이메일: your.email@example.com

---

<div align="center">

**Made with ❤️ by kimmyuung**

</div>
