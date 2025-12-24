# 📱 모바일 앱 배포 가이드

> React Native (Expo)를 사용한 iOS 및 Android 앱 배포 가이드입니다.

---

## 📋 목차

1. [사전 요구사항](#사전-요구사항)
2. [Expo 계정 설정](#expo-계정-설정)
3. [앱 설정](#앱-설정)
4. [iOS 배포](#ios-배포)
5. [Android 배포](#android-배포)
6. [OTA 업데이트](#ota-업데이트)

---

## 📋 사전 요구사항

### 공통
- Node.js 18+
- Expo CLI: `npm install -g @expo/eas-cli`
- Expo 계정: https://expo.dev

### iOS
- macOS (Xcode 빌드 시)
- Apple Developer Program 가입 ($99/년)
- Xcode 15+

### Android
- Google Play Console 계정 (일회성 $25)
- Android Studio (선택)

---

## 🔐 Expo 계정 설정

### 1. EAS CLI 설치 및 로그인
```bash
# EAS CLI 설치
npm install -g @expo/eas-cli

# Expo 로그인
eas login
```

### 2. 프로젝트 설정
```bash
cd frontend

# EAS 프로젝트 초기화
eas build:configure
```

---

## ⚙️ 앱 설정

### app.json 수정
```json
{
  "expo": {
    "name": "감성 일기",
    "slug": "emotion-diary",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FFE5E5"
    },
    "ios": {
      "bundleIdentifier": "com.yourname.emotiondiary",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSMicrophoneUsageDescription": "음성 일기 녹음을 위해 마이크 접근이 필요합니다.",
        "NSLocationWhenInUseUsageDescription": "일기에 위치를 추가하기 위해 위치 접근이 필요합니다."
      }
    },
    "android": {
      "package": "com.yourname.emotiondiary",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFE5E5"
      },
      "permissions": [
        "RECORD_AUDIO",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    },
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    },
    "owner": "your-expo-username"
  }
}
```

### eas.json 설정
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json"
      }
    }
  }
}
```

---

## 🍎 iOS 배포

### 1. Apple Developer 설정
1. [Apple Developer](https://developer.apple.com)에서 앱 등록
2. App Store Connect에서 앱 생성
3. 번들 ID: `com.yourname.emotiondiary`

### 2. 빌드
```bash
# 프로덕션 빌드
eas build --platform ios --profile production

# 미리보기 빌드 (TestFlight용)
eas build --platform ios --profile preview
```

### 3. 제출
```bash
# App Store에 자동 제출
eas submit --platform ios --latest

# 또는 수동 제출
# 빌드 완료 후 .ipa 파일을 Transporter 앱으로 업로드
```

### 4. TestFlight (베타 테스트)
1. App Store Connect → TestFlight 탭
2. 빌드 선택 → 테스터 추가
3. 테스터가 TestFlight 앱으로 설치

---

## 🤖 Android 배포

### 1. Google Play Console 설정
1. [Google Play Console](https://play.google.com/console)에서 앱 생성
2. 서비스 계정 생성 (API 접근용)
3. JSON 키 파일 다운로드 → `google-service-account.json`

### 2. 빌드
```bash
# AAB 빌드 (Play Store용)
eas build --platform android --profile production

# APK 빌드 (직접 배포용)
eas build --platform android --profile preview
```

### 3. 제출
```bash
# Play Store에 자동 제출
eas submit --platform android --latest

# 또는 수동 제출
# Play Console에서 .aab 파일 직접 업로드
```

### 4. 내부 테스트 트랙
1. Play Console → 내부 테스트
2. 테스터 이메일 추가
3. 링크 공유

---

## 🔄 OTA 업데이트

> Over-The-Air 업데이트로 스토어 심사 없이 JS 코드 업데이트 가능

### EAS Update 설정
```bash
# 업데이트 채널 설정
eas update:configure
```

### 업데이트 배포
```bash
# 프로덕션 업데이트
eas update --branch production --message "버그 수정"

# 미리보기 업데이트
eas update --branch preview --message "새 기능 테스트"
```

### 롤백
```bash
# 이전 버전으로 롤백
eas update:republish --group <update-group-id>
```

---

## 🔧 환경 변수 설정

### 프로덕션 환경 변수
```bash
# EAS에 시크릿 설정
eas secret:create --name API_URL --value https://api.your-domain.com --scope project
eas secret:create --name SENTRY_DSN --value https://xxx@sentry.io/xxx --scope project
```

### 앱에서 사용
```typescript
// app.config.ts
export default {
  expo: {
    extra: {
      apiUrl: process.env.API_URL || 'http://localhost:8000',
    },
  },
};

// 사용
import Constants from 'expo-constants';
const API_URL = Constants.expoConfig?.extra?.apiUrl;
```

---

## 📱 아이콘 및 스플래시

### 필요한 이미지
- `icon.png`: 1024x1024 (앱 아이콘)
- `adaptive-icon.png`: 1024x1024 (Android 적응형 아이콘)
- `splash.png`: 1284x2778 (스플래시 화면)

### 생성 도구
- [App Icon Generator](https://appicon.co/)
- [Figma](https://www.figma.com/)

---

## 📊 스토어 등록 정보

### 필요한 자료
- 앱 이름: 감성 일기 - AI 일기 앱
- 짧은 설명 (80자): 당신의 하루를 AI가 듣고, 이해하고, 그림으로 그려줍니다.
- 긴 설명 (4000자): 주요 기능 상세 설명
- 스크린샷: 각 기기별 5-10장
- 프로모션 비디오 (선택)

### 카테고리
- iOS: Lifestyle
- Android: Lifestyle → Personal Development

---

## 📝 체크리스트

### 배포 전 확인

**공통**
- [ ] 앱 아이콘 및 스플래시 설정
- [ ] 버전 번호 업데이트
- [ ] 프로덕션 API URL 설정
- [ ] 모든 권한 설명 문구 작성

**iOS**
- [ ] Apple Developer 가입
- [ ] App Store Connect 앱 생성
- [ ] 번들 ID 설정
- [ ] 스크린샷 준비 (iPhone, iPad)

**Android**
- [ ] Google Play Console 계정
- [ ] 서비스 계정 JSON 키
- [ ] 스크린샷 준비 (Phone, Tablet)

---

## 🔗 유용한 링크

- [Expo 문서](https://docs.expo.dev/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Google Play Console](https://play.google.com/console/)
