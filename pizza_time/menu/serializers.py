from rest_framework import serializers

from menu.models import Pizza


class PizzaSerializer(serializers.ModelSerializer):
    category = serializers.SlugRelatedField(read_only=True, slug_field='name')
    class Meta:
        model = Pizza
        fields = [
            'id',
            'name',
            'description',
            'price',
            'image',
            'created_at',
            'updated_at',
            'category',
        ]
