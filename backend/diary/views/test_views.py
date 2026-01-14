from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from diary.services.image_service import ImageGenerator
import traceback

@require_http_methods(["GET"])
def test_image_gen_view(request):
    try:
        content = request.GET.get('content', "A peaceful garden")
        emotion = request.GET.get('emotion', "peaceful")
        
        service = ImageGenerator()
        print(f"DEBUG_VIEW: Generating for {content}")
        result = service.generate(content, emotion=emotion)
        
        return JsonResponse({
            "status": "success",
            "url": result.get('url'),
            "prompt": result.get('prompt')
        })
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({
            "status": "error",
            "message": str(e)
        }, status=500)
