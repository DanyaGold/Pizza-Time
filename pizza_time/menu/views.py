from rest_framework import generics, viewsets
from rest_framework.pagination import PageNumberPagination

from menu.models import Pizza
from menu.serializers import PizzaSerializer


class PizzaPagination(PageNumberPagination):
    page_size = 6
    page_query_param = 'page'
    max_page_size = 100


class PizzaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Pizza.available.all()
    serializer_class = PizzaSerializer
    #полное совпадение
    filterset_fields = {
        'price': ['gte', 'lte'],
        'category__slug': ['exact'],
        'category__id': ['exact'],
    }
    #частичное совпадение
    search_fields = ['name', 'description']
    #сортировка
    ordering_fields = ['price', 'name']
    ordering = ['name']
    #пагинация
    pagination_class = PizzaPagination