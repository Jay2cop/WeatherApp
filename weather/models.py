from django.db import models

class City(models.Model):
    name = models.CharField(max_length=255)
    temperature = models.FloatField(default=0.0)
    weather_conditions = models.CharField(max_length=255, default='')

    def __str__(self):
        return self.name
