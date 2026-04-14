from django.urls import path
from . import views

urlpatterns = [
    path('chat/', views.chat, name='chatbot-chat'),
    path('history/<str:session_id>/', views.history, name='chatbot-history'),
]
