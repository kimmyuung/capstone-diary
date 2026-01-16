"""
AI 기능 실제 API 테스트 스크립트
서버가 실행 중일 때 사용
"""
import requests
import json

BASE_URL = "http://localhost:8000"

# 테스트용 토큰 (실제 사용자 토큰으로 교체 필요)
# 먼저 로그인해서 토큰을 얻어야 합니다
def get_auth_token():
    """로그인해서 토큰 얻기"""
    response = requests.post(f"{BASE_URL}/api/token/", json={
        "username": "test",
        "password": "test1234"
    })
    if response.status_code == 200:
        return response.json().get("access")
    return None

def test_health():
    """Health Check 테스트"""
    print("\n=== Health Check ===")
    response = requests.get(f"{BASE_URL}/api/health/")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    return response.status_code == 200

def test_summarize(token):
    """AI 요약 API 테스트"""
    print("\n=== AI Summarize API ===")
    headers = {"Authorization": f"Bearer {token}"}
    
    content = """
    오늘은 정말 좋은 하루였습니다. 아침에 일어나서 맛있는 아침을 먹고, 
    친구들과 함께 카페에 가서 커피를 마셨습니다. 오후에는 공원에서 산책을 하고,
    저녁에는 가족들과 함께 맛있는 저녁 식사를 했습니다. 
    정말 행복한 하루였습니다. 내일도 이런 좋은 하루가 계속되었으면 좋겠습니다.
    """
    
    response = requests.post(
        f"{BASE_URL}/api/summarize/",
        headers=headers,
        json={"content": content, "style": "default"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Summary: {data.get('summary', 'N/A')}")
        print(f"Original Length: {data.get('original_length')}")
        print(f"Summary Length: {data.get('summary_length')}")
    else:
        print(f"Error: {response.text[:200]}")
    return response.status_code == 200

def test_suggest_title(token):
    """AI 제목 제안 API 테스트"""
    print("\n=== AI Suggest Title API ===")
    headers = {"Authorization": f"Bearer {token}"}
    
    content = "오늘은 친구들과 함께 바다에 갔습니다. 파도 소리를 들으며 모래사장에서 놀았습니다."
    
    response = requests.post(
        f"{BASE_URL}/api/suggest-title/",
        headers=headers,
        json={"content": content}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Suggested Title: {data.get('suggested_title', 'N/A')}")
    else:
        print(f"Error: {response.text[:200]}")
    return response.status_code == 200

def test_chat(token):
    """AI 채팅 API 테스트"""
    print("\n=== AI Chat API ===")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.post(
        f"{BASE_URL}/api/chat/",
        headers=headers,
        json={"message": "안녕하세요! 오늘 기분이 어떤가요?", "history": []}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        # Streaming response
        print(f"Response (first 200 chars): {response.text[:200]}")
    else:
        print(f"Error: {response.text[:200]}")
    return response.status_code == 200

def test_template_generate(token):
    """AI 템플릿 생성 API 테스트"""
    print("\n=== AI Template Generate API ===")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.post(
        f"{BASE_URL}/api/templates/generate/",
        headers=headers,
        json={"topic": "여행 일기", "style": "default"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Template Name: {data.get('name', 'N/A')}")
        print(f"Template Emoji: {data.get('emoji', 'N/A')}")
    else:
        print(f"Error: {response.text[:200]}")
    return response.status_code == 200

def test_chat_sessions(token):
    """채팅 세션 API 테스트"""
    print("\n=== Chat Session API ===")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 세션 목록 조회
    response = requests.get(f"{BASE_URL}/api/chat/sessions/", headers=headers)
    print(f"Session List Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Session Count: {data.get('count', 0)}")
    
    # 새 세션 생성
    response = requests.post(
        f"{BASE_URL}/api/chat/sessions/",
        headers=headers,
        json={"title": "테스트 세션"}
    )
    print(f"Create Session Status: {response.status_code}")
    
    return response.status_code in [200, 201]

def main():
    print("=" * 50)
    print("AI 기능 테스트 시작")
    print("=" * 50)
    
    # Health check (인증 불필요)
    test_health()
    
    # 토큰 없이 401 확인
    print("\n=== 인증 없이 API 호출 (401 예상) ===")
    response = requests.post(f"{BASE_URL}/api/summarize/", json={"content": "test"})
    print(f"Unauthenticated Status: {response.status_code}")
    
    # 토큰 얻기 시도
    token = get_auth_token()
    if token:
        print(f"\n토큰 획득 성공!")
        test_summarize(token)
        test_suggest_title(token)
        test_chat(token)
        test_template_generate(token)
        test_chat_sessions(token)
    else:
        print("\n토큰 획득 실패 - 테스트 사용자 없음 (예상됨)")
        print("테스트 사용자를 생성하거나 기존 사용자 정보로 로그인 필요")
    
    print("\n" + "=" * 50)
    print("테스트 완료")
    print("=" * 50)

if __name__ == "__main__":
    main()
