# map/urls.py (CÓDIGO FINALIZADO)

from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from .views import EarthquakeViewSet # Importamos el ViewSet
from . import views

# Configuración del Router para la API REST estándar (CRUD)
router = DefaultRouter()
router.register(r'earthquakes', views.EarthquakeViewSet, basename='earthquake') # Añadimos basename para evitar ambigüedad

urlpatterns = [
    # 1. RUTA PRINCIPAL (Frontend)
    path('', views.map_editor, name='map_editor'), 
    
    # --- RUTAS DE API ---
    
    # 2. Rutas automáticas del router (ej: /map/api/earthquakes/)
    path('', include(router.urls)), 
    
    # 3. Carga de Datos Inicial (POST: /map/api/upload/)
    path('upload/', views.upload_earthquakes, name='api_upload_earthquakes'),
    
    # 4. Recálculo Dinámico (POST: /map/api/recalculate/)
    path('recalculate/', views.recalculate_on_edit, name='api_recalculate_on_edit'),
    
    # 5. ANÁLISIS Y FILTRADO (BACKEND)
    path('analyze/', views.analyze_earthquakes, name='api_analyze_earthquakes'),

    # 5. Carga de Zonas Fuente Sismogénicas (GET: /map/api/zfs/)
    path('zfs/', views.get_seismic_source_zones, name='api_zfs'),
    
    # 6. Exportación (GET: /map/api/export/csv/)
    re_path(r'^export/(?P<format>[a-z]+)/$', views.export_earthquakes, name='api_export_earthquakes'),

]