---
description: API 문서화 - Swagger/OpenAPI 설정 및 문서 확인 방법
---

# API 문서화 워크플로우

이 문서는 감성 일기 앱의 API 문서화 방법을 설명합니다.

## 1. Swagger UI 접속

// turbo
```bash
# 백엔드 서버 시작 (이미 실행 중이면 생략)
cd backend
.\venv\Scripts\python.exe manage.py runserver
```

브라우저에서 http://localhost:8000/swagger/ 접속

---

## 2. API 엔드포인트 목록

### 인증 (Authentication)
| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/token/` | POST | JWT 토큰 발급 (로그인) |
| `/api/token/refresh/` | POST | 토큰 갱신 |
| `/api/register/` | POST | 회원가입 |
| `/api/email/verify/` | POST | 이메일 인증 |
| `/api/password/reset-request/` | POST | 비밀번호 재설정 요청 |
| `/api/password/reset/` | POST | 비밀번호 재설정 |

### 일기 (Diary)
| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/diaries/` | GET | 일기 목록 조회 |
| `/api/diaries/` | POST | 일기 작성 |
| `/api/diaries/{id}/` | GET | 일기 상세 조회 |
| `/api/diaries/{id}/` | PUT | 일기 수정 |
| `/api/diaries/{id}/` | DELETE | 일기 삭제 |

### 일기 검색 파라미터
| 파라미터 | 설명 | 예시 |
|----------|------|------|
| `search` | 제목 검색 | `?search=여행` |
| `content_search` | 본문 검색 | `?content_search=카페` |
| `q` | 통합 검색 (제목+본문) | `?q=오늘` |
| `emotion` | 감정 필터 | `?emotion=happy` |
| `start_date` | 시작 날짜 | `?start_date=2024-01-01` |
| `end_date` | 종료 날짜 | `?end_date=2024-12-31` |

### 리포트 및 통계
| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/diaries/report/` | GET | 주간/월간 감정 리포트 |
| `/api/diaries/annual-report/` | GET | 연간 리포트 |
| `/api/diaries/calendar/` | GET | 캘린더 월별 요약 |
| `/api/diaries/gallery/` | GET | AI 이미지 갤러리 |
| `/api/diaries/locations/` | GET | 위치별 일기 목록 |

### 내보내기 (Export)
| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/diaries/export/` | GET | JSON 형식 내보내기 |
| `/api/diaries/export-pdf/` | GET | PDF 형식 내보내기 |

### AI 기능
| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/diaries/{id}/generate-image/` | POST | AI 이미지 생성 |
| `/api/transcribe/` | POST | 음성→텍스트 변환 |

### 시스템
| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/health/` | GET | 서버 상태 체크 |
| `/api/sentry-test/` | GET | Sentry 연동 테스트 |

---

## 3. 인증 방법

### JWT 토큰 발급
```bash
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "user", "password": "pass"}'
```

### 인증된 요청
```bash
curl -X GET http://localhost:8000/api/diaries/ \
  -H "Authorization: Bearer <access_token>"
```

---

## 4. 에러 응답 형식

모든 에러는 다음 형식으로 반환됩니다:

```json
{
    "success": false,
    "error": "에러 메시지",
    "code": "ERROR_CODE",
    "details": { ... }
}
```

### 에러 코드
| 코드 | 설명 |
|------|------|
| `AUTH_REQUIRED` | 로그인 필요 |
| `AUTH_FAILED` | 인증 실패 |
| `PERMISSION_DENIED` | 접근 권한 없음 |
| `NOT_FOUND` | 리소스 없음 |
| `VALIDATION_ERROR` | 유효성 검증 실패 |
| `SERVER_ERROR` | 서버 오류 |

---

## 5. Swagger 문서 갱신

API 변경 시 docstring을 업데이트하면 자동 반영됩니다:

```python
class DiaryViewSet(viewsets.ModelViewSet):
    """
    일기 CRUD API
    
    list:
        일기 목록 조회
        
    create:
        새 일기 작성
    """
```

---

## 6. API 테스트 (curl 예시)

// turbo
```bash
# 일기 목록 조회 (통합 검색)
curl "http://localhost:8000/api/diaries/?q=여행" \
  -H "Authorization: Bearer <token>"

# 본문 검색
curl "http://localhost:8000/api/diaries/?content_search=카페" \
  -H "Authorization: Bearer <token>"

# 연간 리포트 조회
curl "http://localhost:8000/api/diaries/annual-report/?year=2024" \
  -H "Authorization: Bearer <token>"
```
