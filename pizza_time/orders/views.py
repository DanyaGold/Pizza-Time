import uuid
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet
from yookassa import Configuration, Payment
from .models import Order

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from yookassa.domain.notification import WebhookNotification
import json

from .serializers import OrderCreateSerializer, OrderHistorySerializer

Configuration.configure(settings.YOOKASSA_SHOP_ID, settings.YOOKASSA_SECRET_KEY)


class OrderHistoryView(ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderHistorySerializer

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items')


class CreateOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

        idempotency_key = str(uuid.uuid4())
        payment = Payment.create({
            "amount": {
                "value": str(order.total_price),
                "currency": "RUB"
            },
            "expires_at": (timezone.now() + timedelta(minutes=10)).isoformat(),
            "confirmation": {
                "type": "redirect",
                "return_url": "http://127.0.0.1:5500"
            },
            "capture": True,
            "description": f"Оплата заказа №{order.id} для {request.user.username}",
            "metadata": {
                "order_id": order.id
            }
        }, idempotency_key)

        order.payment_url = payment.confirmation.confirmation_url
        order.save()

        return Response({
            "order_id": order.id,
            "payment_url": payment.confirmation.confirmation_url
        })


@csrf_exempt
def yookassa_webhook(request):
    event_json = json.loads(request.body)

    try:
        notification_object = WebhookNotification(event_json)
        payment = notification_object.object

        order_id = payment.metadata.get('order_id')
        order = Order.objects.get(id=order_id)

        if notification_object.event == 'payment.succeeded':
            order.status = 'paid'
            order.save()
            print(f"Заказ №{order_id} успешно оплачен!")

        elif notification_object.event == 'payment.canceled':
            if order.status == 'pending':
                order.status = 'canceled'
                order.save()
                print(f"Заказ №{order_id} отменен ЮKassa по таймауту.")

    except Exception as e:
        print(f"Ошибка при обработке вебхука: {e}")
        return HttpResponse(status=400)

    return HttpResponse(status=200)