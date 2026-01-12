
import os
import sys
import google.generativeai as genai
from unittest.mock import MagicMock

# --- FIX FOR ENV LOADING ---
def load_env_file(env_path):
    if not os.path.exists(env_path):
        return

    encodings = ['utf-8', 'cp949', 'utf-16', 'euc-kr']
    for enc in encodings:
        try:
            with open(env_path, 'r', encoding=enc) as f:
                content = f.read()
            
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

# Manually load environment variables
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(backend_dir, '.env')
load_env_file(env_path)
# ---------------------------

api_key = os.environ.get('GEMINI_API_KEY')
if api_key:
    genai.configure(api_key=api_key)
    print("API Key configured.")
else:
    print("API Key NOT found.")

print(f"Version: {genai.__version__}")
print(f"Attributes in genai: {dir(genai)}")

try:
    print("\n--- Available Gemini Models ---")
    models = sorted([m.name for m in genai.list_models() if 'gemini' in m.name.lower()])
    for name in models:
        print(name)
    print("-------------------------------")
except Exception as e:
    print(f"List models failed: {e}")

