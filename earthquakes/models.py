from django.db import models

class Earthquake(models.Model):
    name = models.CharField(max_length=100, blank=True)
    magnitude = models.FloatField()
    depth = models.FloatField()
    date = models.DateTimeField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    source = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.name or 'Terremoto'} ({self.magnitude})"
