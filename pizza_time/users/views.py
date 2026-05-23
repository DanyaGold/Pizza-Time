from django.shortcuts import get_object_or_404
from rest_framework.generics import CreateAPIView, RetrieveUpdateDestroyAPIView

from users.models import User
from users.serializers import RegisterSerializer, ProfileSerializer
from rest_framework.permissions import IsAuthenticated


class RegisterView(CreateAPIView):
    serializer_class = RegisterSerializer


class ProfileView(RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        obj = self.request.user
        self.check_object_permissions(self.request, obj)
        return obj