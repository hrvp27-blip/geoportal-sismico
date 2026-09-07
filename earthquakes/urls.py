# map/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EarthquakeViewSet, map_editor, dashboard

# ----------------- ROUTER PARA API -----------------
router = DefaultRouter()
router.register(r'earthquakes', EarthquakeViewSet)

# ----------------- URLS -----------------
urlpatterns = [
    # Página de inicio (dashboard)
    path('', dashboard, name='dashboard'),

    # Visor interactivo de mapa
    path('editor/', map_editor, name='map_editor'),

    # API REST
    path('api/', include(router.urls)),
]
