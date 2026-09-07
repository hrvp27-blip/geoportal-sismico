# openquake_web/urls.py
from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect

urlpatterns = [
    path('', include('earthquakes.urls')),      # Rutas principales (dashboard + visor)
    path('admin/', admin.site.urls),
    path('api/map/', include('map.urls')),      # API REST de mapas
]
