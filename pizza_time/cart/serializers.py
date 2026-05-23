from rest_framework import serializers

from cart.models import CartItem, Cart
from menu.models import Pizza
from menu.serializers import PizzaSerializer


class CartItemSerializer(serializers.ModelSerializer):
    product = PizzaSerializer(read_only=True)

    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Pizza.objects.all(),
        source='product',
        write_only=True
    )

    class Meta:
        model = CartItem
        fields = [
            'id',
            'cart',
            'product',
            'product_id',
            'quantity',
        ]
        read_only_fields = ['cart']

    def create(self, validated_data):
        item, created = CartItem.objects.get_or_create(
            cart=validated_data['cart'],
            product=validated_data['product'],
            defaults={'quantity': validated_data['quantity']}
        )

        if not created:
            item.quantity += validated_data['quantity']
            item.save()

        return item


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = [
            'id',
            'user',
            'items',
            'get_total_price',
        ]
        read_only_fields = ['cart']