from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('get_weather/<str:city_name>/', views.get_weather, name='get_weather'),
    path('add_city/<str:city_name>/', views.add_city, name='add_city'),
    path('delete_city/<str:city_name>/', views.delete_city, name='delete_city'),
    path('get_cities/', views.get_cities, name='get_cities'),
]