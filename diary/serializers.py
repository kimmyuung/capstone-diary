# diary/serializers.py (이미지 필드 추가)
class DiaryImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiaryImage
        fields = ['id', 'image_url', 'ai_prompt', 'created_at']

class DiarySerializer(serializers.ModelSerializer):
    images = DiaryImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Diary
        fields = ['id', 'user', 'content', 'raw_input', 'images', 'created_at']