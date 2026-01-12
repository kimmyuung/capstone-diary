import os
import sys
import django
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

# Setup Django environment
def load_env_file():
    env_path = BASE_DIR / '.env'
    if not env_path.exists():
        print("No .env file found")
        return

    text = None
    encodings = ['utf-8', 'cp949', 'utf-16', 'euc-kr']
    
    for enc in encodings:
        try:
            with open(env_path, encoding=enc) as f:
                text = f.read()
            print(f"Successfully read .env with encoding: {enc}")
            break
        except UnicodeDecodeError:
            continue
            
    if text:
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            os.environ[key.strip()] = value.strip()

load_env_file()

# Mock dotenv to prevent settings.py from reloading .env and causing encoding error
from unittest.mock import MagicMock
sys.modules['dotenv'] = MagicMock()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# from diary.ai_service import DiarySummarizer

def test_summarize():
    print("Testing DiarySummarizer with Gemini...")
    
    try:
        import diary.ai_service
        print(f"Items in ai_service: {dir(diary.ai_service)}")
        from diary.ai_service import DiarySummarizer
    except Exception as e:
        print(f"FAILED TO IMPORT DiarySummarizer: {e}")
        import traceback
        traceback.print_exc()
        return

    sample_text = """
    오늘은 정말 힘든 하루였다. 
    아침부터 비가 와서 회사 가는 길이 너무 막혔고, 지각을 할 뻔했다.
    회사에 도착하니 팀장님이 급한 업무를 주셨는데, 점심시간도 없이 일해야 했다.
    하지만 저녁에 친구를 만나 맛있는 밥을 먹으며 수다를 떠니 스트레스가 풀렸다.
    내일은 좀 더 좋은 일이 생겼으면 좋겠다.
    """
    
    print(f"\n[Original Text]\n{sample_text.strip()}\n")
    
    try:
        summarizer = DiarySummarizer()
        result = summarizer.summarize(sample_text)
        
        if result.get('error'):
            print(f"Error: {result['error']}")
        else:
            print(f"[Summary - {result.get('style')}]")
            print(result['summary'])
            print(f"\nStats: Original {result['original_length']} -> Summary {result['summary_length']}")
            
    except Exception as e:
        print(f"Exception occurred: {e}")

if __name__ == "__main__":
    test_summarize()
