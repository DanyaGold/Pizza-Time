from django.db import models
from django.db.models import ForeignKey, ManyToManyField


class AvailableManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_available=True)


# Create your models here.
class Pizza(models.Model):
    name = models.CharField(max_length=30)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    image = models.ImageField(upload_to='pizzas/', blank=True, null=True)
    is_available = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    category = ForeignKey('Category', on_delete=models.PROTECT, related_name='pizzas')
    #ingredients = ManyToManyField('Ingredient')

    objects = models.Manager()
    available = AvailableManager()

    def __str__(self):
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=30)
    slug = models.SlugField(max_length=255, unique=True)

    def __str__(self):
        return self.name