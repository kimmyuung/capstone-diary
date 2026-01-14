from django.contrib import admin
from django.utils.html import format_html
from .models.diary import Diary, DiaryImage
from .models.tag import Tag, DiaryTag
from .models.template import DiaryTemplate
from .models.preference import UserPreference
from .models.moderation import FlaggedContent, ContentReport

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

# Admin Branding
admin.site.site_header = 'AI Emotion Diary Admin'
admin.site.site_title = 'Emotion Diary Admin'
admin.site.index_title = 'Dashboard'

@admin.register(DiaryImage)
class DiaryImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'diary_info', 'image_preview', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('diary__title', 'diary__user__username', 'ai_prompt')
    readonly_fields = ('image_preview', 'image_url')
    
    def diary_info(self, obj):
        return f"[{obj.diary.user.username}] {obj.diary.title}"
    diary_info.short_description = "일기 정보"

    def image_preview(self, obj):
        if obj.image_url:
            return format_html('<img src="{}" style="max-height: 150px; border-radius: 8px;"/>', obj.image_url)
        return "-"
    image_preview.short_description = "이미지 미리보기"


@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_premium', 'theme', 'language', 'push_enabled', 'auto_emotion_analysis')
    list_filter = ('is_premium', 'theme', 'language', 'push_enabled')
    search_fields = ('user__username', 'user__email')
    list_editable = ('is_premium',)  # 목록에서 바로 수정 가능
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('user',)
        }),
        ('멤버십 관리', {
            'fields': ('is_premium',),
            'description': '사용자의 프리미엄 멤버십 여부를 관리합니다.'
        }),
        ('화면 및 언어', {
            'fields': ('theme', 'language')
        }),
        ('기능 설정', {
            'fields': ('push_enabled', 'daily_reminder_enabled', 'daily_reminder_time', 'auto_emotion_analysis', 'show_location')
        }),
    )


@admin.register(FlaggedContent)
class FlaggedContentAdmin(admin.ModelAdmin):
    list_display = ('id', 'diary_link', 'flag_type', 'confidence', 'detected_at', 'reviewed', 'action_taken')
    list_filter = ('flag_type', 'reviewed', 'action_taken', 'detected_at')
    search_fields = ('diary__title', 'diary__user__username')
    readonly_fields = ('diary', 'flag_type', 'confidence', 'detected_keywords', 'detected_at')
    list_editable = ('action_taken',)
    
    fieldsets = (
        ('감지 정보', {
            'fields': ('diary', 'flag_type', 'confidence', 'detected_keywords', 'detected_at')
        }),
        ('검토 정보', {
            'fields': ('reviewed', 'reviewed_by', 'reviewed_at', 'action_taken', 'admin_notes')
        }),
    )
    
    def diary_link(self, obj):
        from django.urls import reverse
        from django.utils.html import format_html
        url = reverse('admin:diary_diary_change', args=[obj.diary.id])
        return format_html('<a href="{}">{}</a>', url, obj.diary.title)
    diary_link.short_description = '일기'
    
    def save_model(self, request, obj, form, change):
        if change and not obj.reviewed_by:
            obj.reviewed_by = request.user
            from django.utils import timezone
            obj.reviewed_at = timezone.now()
        super().save_model(request, obj, form, change)


@admin.register(ContentReport)
class ContentReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'diary_link', 'reporter', 'reason', 'status', 'created_at')
    list_filter = ('reason', 'status', 'created_at')
    search_fields = ('diary__title', 'reporter__username', 'description')
    readonly_fields = ('diary', 'reporter', 'reason', 'description', 'created_at')
    
    fieldsets = (
        ('신고 정보', {
            'fields': ('diary', 'reporter', 'reason', 'description', 'created_at')
        }),
        ('처리 정보', {
            'fields': ('status', 'reviewed_by', 'reviewed_at', 'resolution_notes')
        }),
    )
    
    def diary_link(self, obj):
        from django.urls import reverse
        from django.utils.html import format_html
        url = reverse('admin:diary_diary_change', args=[obj.diary.id])
        return format_html('<a href="{}">{}</a>', url, obj.diary.title)
    diary_link.short_description = '일기'
    
    def save_model(self, request, obj, form, change):
        if change and not obj.reviewed_by:
            obj.reviewed_by = request.user
            from django.utils import timezone
            obj.reviewed_at = timezone.now()
        super().save_model(request, obj, form, change)
