# map/views.py

import os, io, json, csv
import pandas as pd
import numpy as np

from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponse, HttpResponseServerError
from django.views.decorators.http import require_POST
from django.db import transaction
from django.db.models import Min, Max, Count
from rest_framework import viewsets, filters
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import api_view

from .models import Earthquake
from .serializers import EarthquakeSerializer
from sismologia_tools import calcular_parametros_recurrencia, calcular_mc_maxc

# ============================================================
# PAGINACIÓN Y VIEWSET REST
# ============================================================
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500

class EarthquakeViewSet(viewsets.ModelViewSet):
    queryset = Earthquake.objects.all().order_by('-date')
    serializer_class = EarthquakeSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ['date', 'magnitude', 'depth']
    search_fields = ['source_id', 'name']

    def get_queryset(self):
        qs = super().get_queryset()
        min_mag = self.request.query_params.get('min_mag')
        max_mag = self.request.query_params.get('max_mag')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if min_mag:
            try: qs = qs.filter(magnitude__gte=float(min_mag))
            except ValueError: pass
        if max_mag:
            try: qs = qs.filter(magnitude__lte=float(max_mag))
            except ValueError: pass
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        return qs

# ============================================================
# VISTAS HTML
# ============================================================
def map_editor(request):
    """Mapa 2D"""
    try:
        total_quakes = Earthquake.objects.count()
        min_date = Earthquake.objects.order_by('date').first()
        max_date = Earthquake.objects.order_by('-date').first()

        context = {
            "total_quakes": total_quakes,
            "min_date": min_date.date if min_date else None,
            "max_date": max_date.date if max_date else None,
            "default_min_mag": 0,
            "default_max_mag": 10
        }
        return render(request, 'map/map_editor.html', context)
    except Exception as e:
        return HttpResponseServerError(f"Error al cargar la página del mapa: {str(e)}")


# ============================================================
# SUBIDA DE CSV → GEOJSON
# ============================================================
@csrf_exempt
@api_view(['POST'])
def upload_earthquakes(request):
    file = request.FILES.get('file')
    if not file:
        return JsonResponse({'success': False, 'error': 'No se recibió ningún archivo'}, status=400)

    try:
        content = file.read().decode('latin-1', errors='ignore')
        # Al leer, tratar valores vacíos como NaN para una limpieza más fácil
        df = pd.read_csv(io.StringIO(content), sep=';', engine='python', na_values=['', ' ', 'NA', 'N/A'])
        df.columns = df.columns.str.strip().str.lower()

        # Validación columnas críticas
        required_cols = ['lat', 'lon', 'date']
        for col in required_cols:
            if col not in df.columns:
                return JsonResponse({"success": False, "error": f"Falta columna obligatoria: '{col}'"}, status=400)
        if 'mw' not in df.columns and 'q' not in df.columns:
            return JsonResponse({"success": False, "error": "Falta columna de magnitud ('mw' o 'q')."}, status=400)

        def clean_numeric(col_name):
            if col_name not in df.columns:
                return pd.Series(np.nan, index=df.index) # Devuelve NaNs si la columna no existe
            # Reemplaza comas y convierte a numérico, los errores se vuelven NaN
            s = df[col_name].astype(str).str.replace(',', '.')
            return pd.to_numeric(s, errors='coerce')

        df['lat'] = clean_numeric('lat')
        df['lon'] = clean_numeric('lon')
        df['mag'] = clean_numeric('mw').fillna(clean_numeric('q'))
        df['depth'] = clean_numeric('depth').fillna(0)
        df['smajax'] = clean_numeric('smajax').fillna(0)
        df['sminax'] = clean_numeric('sminax').fillna(0)
        df['strike'] = clean_numeric('strike').fillna(0)

        # Limpieza de fecha
        df['date'] = pd.to_datetime(df['date'], errors='coerce')

        # Filtrado de filas inválidas en columnas críticas
        df = df.dropna(subset=['lat', 'lon', 'mag', 'date'])

        if df.empty:
            return JsonResponse({"success": False, "error": "No se encontraron sismos válidos tras la limpieza."}, status=404)

        # 1. Preparar objetos en memoria (sin tocar DB aún para evitar bloqueos largos)
        earthquakes_objs = []
        for row in df.itertuples():
            # Los valores ya están limpios y son del tipo correcto (float, int, datetime)
            eq = Earthquake(
                source_id=str(getattr(row, 'eventid', f"temp_{row.Index}")),
                magnitude=row.mag,
                depth=row.depth,
                date=row.date,
                latitude=row.lat,
                longitude=row.lon,
                latitude_original=row.lat,
                longitude_original=row.lon,
                smajax=row.smajax,
                sminax=row.sminax,
                strike=row.strike,
                is_main_shock=True # Por defecto, luego se puede aplicar desagrupamiento
            )
            earthquakes_objs.append(eq)

        # 2. Transacción atómica: Borrar e Insertar de golpe
        with transaction.atomic():
            Earthquake.objects.all().delete()
            Earthquake.objects.bulk_create(earthquakes_objs, batch_size=1000)

        stats = {
            "min_mag": float(df['mag'].min()),
            "max_mag": float(df['mag'].max()),
            "min_depth": float(df['depth'].min()),
            "max_depth": float(df['depth'].max())
        }

        return JsonResponse({"success": True, "count": len(earthquakes_objs), "stats": stats, "message": "Datos guardados en base de datos correctamente."})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"success": False, "error": f"Error procesando el archivo: {str(e)}"}, status=500)

# ============================================================
# CONSULTA DB
# ============================================================
@api_view(['GET'])
def get_earthquakes(request):
    qs = Earthquake.objects.all()
    min_mag = request.query_params.get('min_mag')
    max_mag = request.query_params.get('max_mag')
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')

    if min_mag:
        try: qs = qs.filter(magnitude__gte=float(min_mag))
        except ValueError: pass
    if max_mag:
        try: qs = qs.filter(magnitude__lte=float(max_mag))
        except ValueError: pass
    if start_date:
        qs = qs.filter(date__gte=start_date)
    if end_date:
        qs = qs.filter(date__lte=end_date)

    serializer = EarthquakeSerializer(qs, many=True)
    stats = qs.aggregate(min_mag=Min('magnitude'), max_mag=Max('magnitude'), min_depth=Min('depth'), max_depth=Max('depth'), total=Count('id'))
    return JsonResponse({"success": True, "count": qs.count(), "stats": stats, "earthquakes": serializer.data}, safe=False)

# ============================================================
# ANÁLISIS Y FILTRADO (BACKEND POTENTE)
# ============================================================
@csrf_exempt
@api_view(['POST'])
def analyze_earthquakes(request):
    """
    Recibe filtros y geometría de zona.
    Filtra en DB -> Filtra por Polígono (Python) -> Calcula G-R (sismologia_tools).
    Devuelve GeoJSON filtrado y Estadísticas.
    """
    try:
        data = json.loads(request.body)
        
        # 1. Filtrado Básico con ORM (Rápido)
        qs = Earthquake.objects.all()
        
        if data.get('min_mag') and data.get('min_mag') != '': qs = qs.filter(magnitude__gte=float(data['min_mag']))
        if data.get('max_mag') and data.get('max_mag') != '': qs = qs.filter(magnitude__lte=float(data['max_mag']))
        if data.get('min_depth') and data.get('min_depth') != '': qs = qs.filter(depth__gte=float(data['min_depth']))
        if data.get('max_depth') and data.get('max_depth') != '': qs = qs.filter(depth__lte=float(data['max_depth']))
        if data.get('date_start') and data.get('date_start') != '': qs = qs.filter(date__gte=data['date_start'])
        if data.get('date_end') and data.get('date_end') != '': qs = qs.filter(date__lte=data['date_end'])
        if data.get('main_shock') is True: qs = qs.filter(is_main_shock=True)

        # Convertir a DataFrame para procesamiento avanzado y filtrado espacial
        # Usamos list values para eficiencia
        vals = list(qs.values('id', 'date', 'latitude', 'longitude', 'depth', 'magnitude', 'is_main_shock', 'smajax', 'sminax', 'strike', 'source_id'))
        df = pd.DataFrame(vals)
        
        if df.empty:
             return JsonResponse({"success": True, "geojson": {"type": "FeatureCollection", "features": []}, "stats": None})

        # Renombrar columnas para compatibilidad con sismologia_tools
        df = df.rename(columns={'magnitude': 'MW', 'date': 'DATE', 'latitude': 'LAT', 'longitude': 'LON'})
        
        # Separamos el DataFrame para análisis (stats) del DataFrame para visualización (mapa)
        df_analysis = df.copy()

        # 2. Filtrado Espacial para ANÁLISIS (Point in Polygon)
        zone_geometry = data.get('zone_geometry')
        if zone_geometry and zone_geometry.get('coordinates'):
            from matplotlib import path # Usamos matplotlib para eficiencia en polígonos
            
            poly_coords = zone_geometry['coordinates'][0] # Asumimos Polygon simple por ahora
            # Aseguramos que los vértices sean 2D (lon, lat), eliminando la altura si existe
            poly_coords = [p[:2] for p in poly_coords]
            p = path.Path(poly_coords)
            
            # Crear array de puntos [lon, lat] del dataframe de análisis
            points = df_analysis[['LON', 'LAT']].values
            mask = p.contains_points(points)
            df_analysis = df_analysis[mask]
            
            # NOTA: No filtramos 'df' (visualización) para que los sismos sigan visibles en el mapa
            # aunque se seleccione una zona.

        # 3. Cálculos Sismológicos (Backend) usando df_analysis
        if df_analysis.empty:
            # Si la zona está vacía, devolvemos stats nulos pero mantenemos el mapa
            recurrence = {'a': 0, 'b': 0, 'lambda': 0, 'T_obs': 0, 'Mc': 0, 'count': 0}
        else:
            mc = calcular_mc_maxc(df_analysis)
            recurrence = calcular_parametros_recurrencia(df_analysis, mc)
            recurrence['count'] = len(df_analysis) # Añadimos conteo real usado en análisis
        
        # 4. Construir GeoJSON de respuesta usando df (TODOS los sismos filtrados por criterio, no por zona)
        features = []
        for _, row in df.iterrows():
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [row['LON'], row['LAT']]},
                "properties": {
                    "id": row['id'],
                    "magnitude": row['MW'],
                    "depth": row['depth'],
                    "date": row['DATE'].isoformat() if hasattr(row['DATE'], 'isoformat') else str(row['DATE']),
                    "is_main_shock": row['is_main_shock'],
                    "eventid": row['source_id'],
                    "semi_major": row['smajax'],
                    "semi_minor": row['sminax'],
                    "azimuth": row['strike']
                }
            })
            
        return JsonResponse({
            "success": True,
            "geojson": {"type": "FeatureCollection", "features": features},
            "stats": recurrence
        })
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)

# ============================================================
# EXPORTACIÓN
# ============================================================
@csrf_exempt
def export_earthquakes(request, format):
    qs = Earthquake.objects.all().order_by('-date')
    if not qs.exists():
        return JsonResponse({"success": False, "error": "No hay sismos para exportar."}, status=404)

    serializer = EarthquakeSerializer(qs, many=True)
    data = serializer.data

    if format.lower() == 'json':
        return JsonResponse({"success": True, "count": len(data), "earthquakes": data}, safe=False)
    elif format.lower() == 'geojson':
        geojson = {"type": "FeatureCollection", "features": [
            {"type": "Feature", "geometry": {"type": "Point", "coordinates": [eq['lon'], eq['lat']]},
             "properties": {"magnitude": eq['mag'], "depth": eq['depth'], "date": eq['date']}} for eq in data]}
        return JsonResponse({"success": True, "count": len(data), "geojson": geojson}, safe=False)
    elif format.lower() == 'csv':
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="earthquakes.csv"'
        return response
    else:
        return JsonResponse({"success": False, "error": f"Formato '{format}' no soportado."}, status=400)

# ============================================================
# RE-CÁLCULO POST-EDICIÓN
# ============================================================
@csrf_exempt
@api_view(['POST'])
def recalculate_on_edit(request):
    try:
        data = json.loads(request.body)
        mags = np.array([float(eq.get("magnitude")) for eq in data if eq.get("magnitude") is not None])
        if len(mags) < 2:
            return JsonResponse({"success": False, "error": "No hay suficientes eventos para recalcular."}, status=400)
        mags = np.sort(mags)
        unique_mags = np.unique(mags)
        if len(unique_mags) < 2:
            return JsonResponse({"success": False, "error": "No hay suficientes magnitudes únicas para recalcular."}, status=400)
        N = np.array([np.sum(mags >= m) for m in unique_mags])
        logN = np.log10(N)
        coeffs = np.polyfit(unique_mags, logN, 1)
        b = -coeffs[0]
        a = coeffs[1]
        fitted = a - b * unique_mags
        return JsonResponse({"success": True, "a_value": float(a), "b_value": float(b),
                             "magnitudes": unique_mags.tolist(), "logN": logN.tolist(), "fitted": fitted.tolist()})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)

# ============================================================
# BORRAR BASE DE DATOS
# ============================================================
@csrf_exempt
@require_POST
def clear_database(request):
    try:
        with transaction.atomic():
            deleted, _ = Earthquake.objects.all().delete()
        return JsonResponse({"success": True, "deleted": deleted, "message": f"{deleted} sismos eliminados correctamente."})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)

# ============================================================
# ZONAS SISMOGÉNICAS
# ============================================================
@csrf_exempt
def get_seismic_source_zones(request):
    path = os.path.join(os.path.dirname(__file__), '..', 'data', 'seismic_source_zones.geojson')

    # Zona por defecto (Iberia + norte Marruecos) en caso de archivo ausente o corrupto
    default_zone = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"name": "Iberian_Region_Default"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [-10.5, 44.5],
                            [4.5, 44.5],
                            [4.5, 27.0],
                            [-10.5, 27.0],
                            [-10.5, 44.5]
                        ]
                    ]
                }
            }
        ]
    }

    try:
        if not os.path.exists(path):
            # Devolver la zona por defecto si no existe el archivo
            return JsonResponse(default_zone, safe=False)

        with open(path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                # Archivo vacío o mal formado: devolvemos zona por defecto
                return JsonResponse(default_zone, safe=False)

            # Si el GeoJSON está vacío o no contiene features válidas usamos la zona por defecto
            if isinstance(data, dict):
                features = data.get('features') if data.get('type') == 'FeatureCollection' else None
                if features and len(features) > 0:
                    return JsonResponse(data, safe=False)
                if data.get('type') == 'Feature' and data.get('geometry'):
                    return JsonResponse(data, safe=False)

            return JsonResponse(default_zone, safe=False)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
