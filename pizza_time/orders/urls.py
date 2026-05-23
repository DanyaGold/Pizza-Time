from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import CreateOrderView, yookassa_webhook, OrderHistoryView

router = DefaultRouter()
router.register(r'history', OrderHistoryView, basename='order')

urlpatterns = [
    path('create/', CreateOrderView.as_view()),
    path('webhook/', yookassa_webhook),
    path('', include(router.urls)),
]