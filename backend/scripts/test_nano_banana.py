import google.generativeai as genai
import os
from django.conf import settings

# Configure API Key (Mocking settings/env if needed, or relying on os.environ)
api_key = os.environ.get('GEMINI_API_KEY')
genai.configure(api_key=api_key)

model_name = 'nano-banana-pro-preview'

def test_image_gen():
    print(f"Testing image generation with {model_name}...")
    try:
        model = genai.GenerativeModel(model_name)
        prompt = "Draw a cute banana character"
        response = model.generate_content(prompt)
        print(f"Response: {response.text}")
        # Check if it generated an image (unlikely for standard Gemini without specific tools/mode)
        # Gemini 3 might support 'imagen' tool or native image output.
        print("Model seems to support text generation. Image generation validation requires inspection of response parts.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    test_image_gen()
