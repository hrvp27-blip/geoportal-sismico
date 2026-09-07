from django.db import models

class Earthquake(models.Model):
    # --- IDENTIFICACIÓN Y DATOS BÁSICOS ---
    source_id = models.CharField(max_length=50, unique=True, verbose_name="ID Fuente (ISC-GEM)")
    name = models.CharField(max_length=100, blank=True, null=True)
    magnitude = models.FloatField(verbose_name="Magnitud (Mw)")
    depth = models.FloatField(verbose_name="Profundidad (km)")
    date = models.DateTimeField(verbose_name="Fecha y Hora")
    
    # --- POSICIÓN DINÁMICA (FASE IV.4) ---
    # latitude/longitude cambian al arrastrar el punto; original se queda fijo
    latitude = models.FloatField(verbose_name="Latitud Actual")
    longitude = models.FloatField(verbose_name="Longitud Actual")
    latitude_original = models.FloatField(default=0.0, verbose_name="Latitud Original")
    longitude_original = models.FloatField(default=0.0, verbose_name="Longitud Original")

    # --- INCERTIDUMBRE Y ELIPSE DE ERROR ---
    smajax = models.FloatField(default=0.0, verbose_name="Semieje Mayor (km)")
    sminax = models.FloatField(default=0.0, verbose_name="Semieje Menor (km)")
    strike = models.FloatField(default=0.0, verbose_name="Azimut/Strike (grados)")

    # --- DESAGRUPAMIENTO ---
    is_main_shock = models.BooleanField(default=True, verbose_name="Sismo Principal")
    
    class Meta:
        verbose_name = "Terremoto"
        verbose_name_plural = "Terremotos"

    def __str__(self):
        return f"ID: {self.source_id} - M{self.magnitude} ({self.date.date()})"