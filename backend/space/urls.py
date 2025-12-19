from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register),
    path('login/', views.login),
    path('spaces/', views.space_list),
    path('reserve/', views.reserve_space),
    path('my_reservations/', views.my_reservations),
    path('admin/overview/', views.admin_overview),
    path('check_in/', views.check_in),
    path('check_out/', views.check_out),
    path('check_violations/', views.check_violations),
]
