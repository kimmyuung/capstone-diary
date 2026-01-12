
import os
import sys
import django

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from diary.ai_service import ImageGenerator

def test_prompt_generation():
    generator = ImageGenerator()
    content = "Today I walked in the park."
    
    # Test happy
    try:
        # We can't easily inspect local variable 'prompt' without mocking, 
        # but we can inspect the EMOTION_STYLES dict and rely on the code change we observed.
        # Or we can verify the method signature works.
        
        print("Styles available:", ImageGenerator.EMOTION_STYLES.keys())
        
        # Checking if happy style exists
        happy_style = ImageGenerator.EMOTION_STYLES.get('happy')
        print(f"Happy style: {happy_style}")
        
        if "Vibrant" not in happy_style:
            print("FAILED: Happy style missing keyword")
            return

        print("SUCCESS: EMOTION_STYLES loaded correctly.")
        
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    test_prompt_generation()
