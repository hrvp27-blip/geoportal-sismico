# sismologia_tools.py

import pandas as pd
import numpy as np
from math import log10
from geopy.distance import geodesic # Necesario para el cálculo preciso de distancias

# --- 1. CONSTANTES Y FUNCIONES AUXILIARES (Gardner & Knopoff) ---

# Coeficientes estándar de Gardner & Knopoff (1974) adaptados para Mw
G_K_COEFFICIENTS = {
    'A': 0.526,  # Coef. temporal (dT en días)
    'B': 0.500,
    'C': -1.024, # Coef. espacial (dD en km)
    'D': 0.380
}

def calcular_distancia_geodesica(lat1, lon1, lat2, lon2):
    """
    Calcula la distancia geodésica en kilómetros entre dos puntos.
    Usa geopy (elipsoide WGS-84) para mayor precisión.
    """
    try:
        return geodesic((lat1, lon1), (lat2, lon2)).km
    except ValueError:
        return float('inf') # Retorna infinito si las coordenadas son inválidas

def desagrupar_gardner_knopoff(df_catalogo):
    """
    Implementa el algoritmo de desagrupamiento G&K (Fase II.3).
    Clasifica los eventos en 'main_shock' (True) y 'replica' (False).
    """
    # 1. Preparación: Ordenar cronológicamente y asegurar magnitud descendente para ventanas
    # (G&K suele procesarse ordenado por magnitud descendente o cronológicamente)
    # Aquí usamos el enfoque estándar: Iterar sobre el catálogo ordenado por magnitud descendente
    # para que los eventos más grandes "limpien" sus réplicas primero.
    
    df = df_catalogo.sort_values(by='MW', ascending=False).copy()
    
    # Inicializar estado: Todos son principales al principio
    df['is_main_shock'] = True 
    
    # Calcular ventanas para todos los eventos vectorialmente
    df['dT_max'] = 10**(G_K_COEFFICIENTS['A'] + G_K_COEFFICIENTS['B'] * df['MW'])
    df['dD_max'] = 10**(G_K_COEFFICIENTS['C'] + G_K_COEFFICIENTS['D'] * df['MW'])
    
    # Convertir a lista de diccionarios para iteración rápida (Pandas iterrows es lento)
    eventos = df.to_dict('records')
    indices_replicas = set() # Usamos un set para guardar índices de réplicas
    
    # Iteramos sobre cada evento (potencial sismo principal)
    for i, evento_principal in enumerate(eventos):
        idx_principal = df.index[i]
        
        # Si ya fue marcado como réplica por un sismo anterior (más grande), saltar
        if idx_principal in indices_replicas:
            continue
            
        lat_p = evento_principal['LAT']
        lon_p = evento_principal['LON']
        t_p = evento_principal['DATE']
        dt_window = evento_principal['dT_max']
        dd_window = evento_principal['dD_max']
        
        # Buscar posibles réplicas en el resto de la lista
        # Nota: Como ordenamos por Mw descendente, los siguientes siempre tienen Mw <= Mw_principal
        for j in range(i + 1, len(eventos)):
            idx_secundario = df.index[j]
            
            if idx_secundario in indices_replicas:
                continue # Ya marcado
            
            evento_secundario = eventos[j]
            t_s = evento_secundario['DATE']
            
            # 1. Chequeo Temporal (Diferencia absoluta en días)
            # G&K define ventana hacia adelante y atrás para foreshocks/aftershocks
            diff_dias = abs((t_s - t_p).total_seconds() / 86400.0)
            
            if diff_dias <= dt_window:
                # 2. Chequeo Espacial (Distancia geodésica)
                dist_km = calcular_distancia_geodesica(lat_p, lon_p, evento_secundario['LAT'], evento_secundario['LON'])
                
                if dist_km <= dd_window:
                    # Es una réplica (o foreshock)
                    indices_replicas.add(idx_secundario)

    # Marcar en el DataFrame original usando los índices recolectados
    df.loc[list(indices_replicas), 'is_main_shock'] = False
    
    # Reordenar cronológicamente antes de devolver
    return df.sort_values(by='DATE')


# --- 2. CÁLCULO DE PARÁMETROS SISMOLÓGICOS (Tus funciones) ---

def calcular_mc_maxc(df_catalogo_depurado, bin_size=0.1):
    """
    Calcula la Magnitud de Completitud (Mc) usando el método de Curvatura Máxima (MAXC).
    """
    # Solo usamos sismos principales
    df = df_catalogo_depurado[df_catalogo_depurado['is_main_shock']].copy()
    
    if df.empty:
        return 0.0
        
    min_mag = np.floor(df['MW'].min())
    max_mag = np.ceil(df['MW'].max())
    
    bins = np.arange(min_mag, max_mag + bin_size, bin_size)
    
    hist, edges = np.histogram(df['MW'], bins=bins)
    magnitudes = edges[:-1] + bin_size / 2
    
    hist_valid = hist[hist > 0]
    magnitudes_valid = magnitudes[hist > 0]
    
    if len(hist_valid) < 3:
        return min_mag # Fallback seguro
    
    log_N = np.log10(hist_valid)
    delta_log_N = np.diff(log_N) / np.diff(magnitudes_valid)
    curvatura = np.diff(delta_log_N) / np.diff(magnitudes_valid[:-1])
    
    if len(curvatura) == 0:
        return min_mag

    max_curvature_index = np.argmax(curvatura)
    mc = magnitudes_valid[1:-1][max_curvature_index]
    
    return mc


def calcular_parametros_recurrencia(df_catalogo_depurado, mc, bin_size=0.1):
    """
    Calcula a, b (MLE) y lambda.
    """
    # Filtrar por Mc y Main Shock
    df_completo = df_catalogo_depurado[
        (df_catalogo_depurado['MW'] >= mc) & (df_catalogo_depurado['is_main_shock'])
    ].copy()
    
    if df_completo.empty:
        return {'a': 0.0, 'b': 0.0, 'lambda': 0.0, 'T_obs': 1.0, 'Mc': mc}

    M_bar = df_completo['MW'].mean()
    N_total = len(df_completo)

    # Periodo de observación
    if not pd.api.types.is_datetime64_any_dtype(df_catalogo_depurado['DATE']):
         df_catalogo_depurado['DATE'] = pd.to_datetime(df_catalogo_depurado['DATE'])

    T_obs_seconds = (df_catalogo_depurado['DATE'].max() - df_catalogo_depurado['DATE'].min()).total_seconds()
    T_obs_años = T_obs_seconds / (365.25 * 86400)
    if T_obs_años <= 0: T_obs_años = 1.0 / 365.25 # Mínimo 1 día para evitar div/0

    # MLE (Utsu)
    b = 0.43429 / (M_bar - (mc - bin_size / 2))
    a = log10(N_total / T_obs_años) + b * mc
    lambda_rate = N_total / T_obs_años 
    
    return {
        'a': a, 
        'b': b, 
        'lambda': lambda_rate, 
        'T_obs': T_obs_años,
        'Mc': mc
    }


def calcular_tara_sismica(df_completo, T_obs_años):
    """
    Calcula la Tasa de Momento Sísmico (Nm/año).
    """
    if df_completo.empty or T_obs_años <= 0:
        return 0.0

    # M0 en Nm: log10(M0) = 1.5*Mw + 9.1
    df_completo['M0_Nm'] = 10**(1.5 * df_completo['MW'] + 9.1)
    
    M0_total = df_completo['M0_Nm'].sum()
    return M0_total / T_obs_años