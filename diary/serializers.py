# diary/serializers.py
from rest_framework import serializers
from .models import Diary, DiaryImage


class DiaryImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiaryImage
        fields = ['id', 'image_url', 'ai_prompt', 'created_at']


class DiarySerializer(serializers.ModelSerializer):
    """
    일기 Serializer
    - 저장 시 내용 암호화 + 감정 분석
    - 조회 시 내용 복호화
    """
    images = DiaryImageSerializer(many=True, read_only=True)
    emotion_emoji = serializers.SerializerMethodField()
    
    class Meta:
        model = Diary
        fields = [
            'id', 'user', 'title', 'content', 'images',
            'emotion', 'emotion_score', 'emotion_emoji', 'emotion_analyzed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'updated_at', 'emotion', 'emotion_score', 'emotion_analyzed_at']
    
    def get_emotion_emoji(self, obj):
        """감정 이모지 반환"""
        return obj.get_emotion_display_emoji() if obj.emotion else None
    
    def to_representation(self, instance):
        """조회 시 암호화된 내용을 복호화하여 반환"""
        data = super().to_representation(instance)
        data['content'] = instance.decrypt_content()
        return data
    
    def create(self, validated_data):
        """생성 시 내용 암호화 + 감정 분석"""
        plain_content = validated_data.pop('content', '')
        instance = Diary(**validated_data)
        instance.encrypt_content(plain_content)
        instance.save()
        
        # 비동기로 감정 분석 (또는 동기로 바로 실행)
        try:
            from .emotion_service import analyze_diary_emotion
            analyze_diary_emotion(instance)
        except Exception as e:
            import logging
            logging.getLogger('diary').error(f"Emotion analysis failed: {e}")
        
        return instance
    
    def update(self, instance, validated_data):
        """수정 시 내용 암호화 + 감정 재분석"""
        content_changed = False
        
        if 'content' in validated_data:
            plain_content = validated_data.pop('content')
            instance.encrypt_content(plain_content)
            content_changed = True
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        # 내용이 변경되면 감정 재분석
        if content_changed:
            try:
                from .emotion_service import analyze_diary_emotion
                analyze_diary_emotion(instance)
            except Exception as e:
                import logging
                logging.getLogger('diary').error(f"Emotion analysis failed: {e}")
        
        return instance

