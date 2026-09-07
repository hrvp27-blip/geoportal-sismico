from django.contrib import admin
from .models import Earthquake

@admin.register(Earthquake)
class EarthquakeAdmin(admin.ModelAdmin):
    list_display = ('source_id', 'magnitude', 'date', 'latitude', 'longitude', 'is_main_shock')
    list_filter = ('is_main_shock',)
    search_fields = ('source_id',)
