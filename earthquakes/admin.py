from django.contrib import admin
from .models import Earthquake

@admin.register(Earthquake)
class EarthquakeAdmin(admin.ModelAdmin):
    list_display = ("name", "magnitude", "depth", "date", "latitude", "longitude", "source")
    list_filter = ("source",)
    search_fields = ("name",)
