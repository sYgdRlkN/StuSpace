from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login),
    path('spaces/', views.space_list),
    path('reserve/', views.reserve_space),
]
