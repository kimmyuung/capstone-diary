
import os
import sys
import django
import logging
from unittest.mock import MagicMock

# --- FIX FOR ENV LOADING ---
def load_env_file(env_path):
    if not os.path.exists(env_path):
        print(f"Warning: .env file not found at {env_path}")
        return

    encodings = ['utf-8', 'cp949', 'utf-16', 'euc-kr']
    for enc in encodings:
        try:
            with open(env_path, 'r', encoding=enc) as f:
                content = f.read()
                
            print(f"Successfully read .env with encoding: {enc}")
            
            # Parse manually
            for line in content.splitlines():
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip().strip("'").strip('"')
                
                if key and value:
                    os.environ[key] = value
            return
        except UnicodeError:
            continue
        except Exception as e:
            print(f"Error reading .env with {enc}: {e}")

    print("Failed to read .env file with any supported encoding.")

# 1. Manually load environment variables
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(backend_dir, '.env')
load_env_file(env_path)

# 2. Mock dotenv to prevent settings.py from crashing
sys.modules['dotenv'] = MagicMock()
# ---------------------------

# Set up Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Setup Logging
logger = logging.getLogger(__name__)

def test_image_generation():
    print("Testing ImageGenerator with Gemini (Imagen)...")
    
    try:
        from diary.ai_service import ImageGenerator
        
        generator = ImageGenerator()
        content = "A calm lake reflecting the starry night sky, with fireflies dancing around."
        
        print(f"Generating image for prompt: '{content}'")
        result = generator.generate(content)
        
        print("Image Generation Result:")
        print(f"URL: {result['url']}")
        print(f"Prompt: {result['prompt']}")
        
        # Verify file exists
        from django.conf import settings
        # Extract relative path from URL (remove /media/)
        relative_path = result['url'].replace(settings.MEDIA_URL, '')
        full_path = os.path.join(settings.MEDIA_ROOT, relative_path)
        
        if os.path.exists(full_path):
            print(f"SUCCESS: Image file found at {full_path}")
            print(f"File Size: {os.path.getsize(full_path)} bytes")
        else:
            print(f"FAILURE: Image file NOT found at {full_path}")
            
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_image_generation()
