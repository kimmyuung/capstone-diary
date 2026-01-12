from django.contrib import admin
from django.utils.html import format_html
from .models.diary import Diary, DiaryImage
from .models.tag import Tag, DiaryTag
from .models.template import DiaryTemplate
from .models.preference import UserPreference

class DiaryImageInline(admin.TabularInline):
    model = DiaryImage
    extra = 0
    readonly_fields = ['image_preview']

    def image_preview(self, obj):
        if obj.image_url:
            return format_html('<img src="{}" style="max-height: 100px;"/>', obj.image_url)
        return "-"
    image_preview.short_description = "미리보기"

@admin.register(Diary)
class DiaryAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'title', 'get_emotion_display', 'emotion_score', 'created_at')
    list_filter = ('emotion', 'created_at', 'user', 'is_encrypted')
    search_fields = ('title', 'user__username', 'user__email')
    readonly_fields = ('created_at', 'updated_at', 'decrypted_content')
    inlines = [DiaryImageInline]
    
    def get_emotion_display(self, obj):
        return f"{obj.get_emotion_display_emoji()} {obj.emotion}" if obj.emotion else "-"
    get_emotion_display.short_description = "감정"

    def decrypted_content(self, obj):
        try:
            return obj.decrypt_content()
        except Exception as e:
            return f"복호화 실패: {str(e)}"
    decrypted_content.short_description = "복호화된 내용 (읽기 전용)"

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'color_display', 'user', 'created_at')
    list_filter = ('user',)
    search_fields = ('name', 'user__username')

    def color_display(self, obj):
        return format_html(
            '<span style="background-color: {}; width: 20px; height: 20px; display: inline-block; border-radius: 50%; border: 1px solid #ccc;"></span> {}',
            obj.color, obj.color
        )
    color_display.short_description = "색상"

@admin.register(DiaryTemplate)
class DiaryTemplateAdmin(admin.ModelAdmin):
    list_display = ('id', 'emoji', 'name', 'template_type', 'category', 'use_count', 'is_active')
    list_filter = ('template_type', 'category', 'is_active')
    search_fields = ('name', 'content')
    list_editable = ('is_active', 'use_count')

@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'theme', 'language', 'push_enabled', 'auto_emotion_analysis')
    list_filter = ('theme', 'language', 'push_enabled')
    search_fields = ('user__username', 'user__email')
