from rest_framework import viewsets
from .models import Earthquake
from .serializers import EarthquakeSerializer
from django.shortcuts import render

# API
class EarthquakeViewSet(viewsets.ModelViewSet):
    queryset = Earthquake.objects.all()
    serializer_class = EarthquakeSerializer

    # Permitir updates parciales (solo lat/lng)
    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)

# Vista del dashboard (landing page)
def dashboard(request):
    return render(request, 'map/dashboard.html')

# Vista del mapa
def map_editor(request):
    return render(request, 'map/map_editor.html')
