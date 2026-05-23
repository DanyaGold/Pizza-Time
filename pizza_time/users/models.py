from django.contrib.auth.models import AbstractUser
from django.db import models

# Create your models here.
class User(AbstractUser):
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    date_birth = models.DateTimeField(blank=True, null=True)
    phone = models.CharField(max_length=12, blank=True)