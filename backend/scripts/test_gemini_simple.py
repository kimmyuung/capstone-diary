import os
import sys
from pathlib import Path
import google.generativeai as genai

# Set up stdout to handle UTF-8 if necessary
try:
    sys.stdout.reconfigure(encoding='utf-8')
except:
    pass

def get_env_variable(key, env_path):
    print(f"Reading {env_path}...")
    try:
        with open(env_path, 'rb') as f:
            content = f.read()
        
        encodings = ['utf-8', 'utf-16', 'cp949', 'euc-kr']
        text = None
        
        for enc in encodings:
            try:
                text = content.decode(enc)
                if key in text:
                    break
            except UnicodeError:
                continue
        
        if text:
            for line in text.splitlines():
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if line.startswith(f"{key}="):
                    val = line.split('=', 1)[1]
                    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                        val = val[1:-1]
                    return val
    except Exception as e:
        print(f"Read failed: {e}")
    return None

def main():
    print("Step 1: Imports functional.")
    
    print("Step 2: Loading API Key...")
    api_key = os.environ.get('GEMINI_API_KEY')
    if api_key:
        print("Key found in os.environ.")
    else:
        BASE_DIR = Path(__file__).resolve().parent.parent
        ENV_PATH = BASE_DIR / '.env'
        api_key = get_env_variable('GEMINI_API_KEY', ENV_PATH)
    
    if not api_key:
        print("Error: GEMINI_API_KEY not found.")
        return

    print(f"Key found: {api_key[:5]}...")

    print("Step 3: Configuring Gemini...")
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        print("Step 4: Generating content...")
        response = model.generate_content("Hello! Verify connection.")
        
        print("\n--- Response ---")
        print(response.text)
        print("----------------")
        print("SUCCESS")
    except Exception as e:
        print(f"Gemini Error: {e}")

if __name__ == "__main__":
    main()
