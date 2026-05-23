from rest_framework import serializers
from django.db import transaction
from cart.models import Cart
from .models import Order, OrderItem


class OrderCreateSerializer(serializers.Serializer):
    def create(self, validated_data):
        user = self.context['request'].user
        try:
            cart = Cart.objects.get(user=user)
            cart_items = cart.items.all()
            if not cart_items.exists():
                raise serializers.ValidationError("Корзина пуста")
        except Cart.DoesNotExist:
            raise serializers.ValidationError("Корзина не найдена")

        total_price = cart.get_total_price

        order = Order.objects.create(
            user=user,
            total_price=total_price,
            status='pending'
        )

        for cart_item in cart_items:
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                product_name=cart_item.product.name,
                price=cart_item.product.price,
                quantity=cart_item.quantity
            )

        cart_items.delete()

        return order


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            'id',
            'product_name',
            'price',
            'quantity'
        ]


class OrderHistorySerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'items',
            'total_price',
            'status',
            'created_at',
            'payment_url'
        ]


