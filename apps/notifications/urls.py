from django.urls import path
from .views import (
    list_notifications, mark_read, mark_all_read, list_offers, notification_stream,
    admin_send_notification, admin_users_list, admin_toggle_user,
    admin_chat_sessions, admin_chat_messages,
    admin_offers, admin_offer_detail,
)

urlpatterns = [
    path('',               list_notifications,  name='notifications-list'),
    path('<int:pk>/read/', mark_read,            name='notification-read'),
    path('read-all/',      mark_all_read,        name='notifications-read-all'),
    path('offers/',        list_offers,          name='offers-list'),
    path('stream/',        notification_stream,  name='notifications-stream'),
    # Admin endpoints
    path('admin/send/',                              admin_send_notification, name='admin-send-notif'),
    path('admin/users/',                             admin_users_list,        name='admin-users-list'),
    path('admin/users/<int:user_id>/toggle/',        admin_toggle_user,       name='admin-toggle-user'),
    path('admin/chat-sessions/',                     admin_chat_sessions,     name='admin-chat-sessions'),
    path('admin/chat-sessions/<int:session_id>/messages/', admin_chat_messages, name='admin-chat-messages'),
    path('admin/offers/',                            admin_offers,            name='admin-offers'),
    path('admin/offers/<int:pk>/',                   admin_offer_detail,      name='admin-offer-detail'),
]
