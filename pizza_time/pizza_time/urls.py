from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers

import cart.views
import orders.views
from menu import views

router = routers.DefaultRouter()
router.register(r'pizza', views.PizzaViewSet)
router.register(r'cartitem', cart.views.CartItemViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/users/', include('users.urls')),
    path('api/cart/', cart.views.CartView.as_view()),
    path('api/orders/', include('orders.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
