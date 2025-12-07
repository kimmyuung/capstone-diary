"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from diary.views import TestConnectionView # 새로 만든 뷰 임포트

urlpatterns = [
    path('admin/', admin.site.urls),
    # 프런트엔드가 호출할 테스트 엔드포인트
    path('api/test/connection/', TestConnectionView.as_view(), name='test_connection'),
]
