from django.urls import path
from .views import my_loyalty, all_loyalty, award_bonus, redeem_points

urlpatterns = [
    path('my/', my_loyalty, name='my-loyalty'),
    path('all/', all_loyalty, name='all-loyalty'),
    path('award-bonus/', award_bonus, name='award-bonus'),
    path('redeem/', redeem_points, name='redeem-points'),
]
