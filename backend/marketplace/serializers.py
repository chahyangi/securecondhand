from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    Category,
    ChatMessage,
    ChatParticipant,
    ChatRoom,
    FriendRequest,
    NotificationSetting,
    Product,
    ProductImage,
    Profile,
    Report,
    TradeVerification,
    VerificationStep,
    Wishlist,
)


class UserSerializer(serializers.ModelSerializer):
    nickname = serializers.CharField(source='profile.nickname', read_only=True)
    icon = serializers.CharField(source='profile.icon', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'nickname', 'icon', 'is_staff', 'is_active']


class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = ['id', 'user', 'nickname', 'icon', 'created_at', 'updated_at']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'order', 'is_representative', 'created_at']


class ProductSerializer(serializers.ModelSerializer):
    seller = UserSerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    wish_count = serializers.IntegerField(source='wishlists.count', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'seller',
            'title',
            'category',
            'category_name',
            'condition',
            'trade_type',
            'description',
            'status',
            'images',
            'wish_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['seller']


class WishlistSerializer(serializers.ModelSerializer):
    product_detail = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = Wishlist
        fields = ['id', 'product', 'product_detail', 'created_at']


class FriendRequestSerializer(serializers.ModelSerializer):
    requester = UserSerializer(read_only=True)
    receiver_detail = UserSerializer(source='receiver', read_only=True)

    class Meta:
        model = FriendRequest
        fields = ['id', 'requester', 'receiver', 'receiver_detail', 'status', 'created_at', 'updated_at']
        read_only_fields = ['requester']


class ChatParticipantSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)

    class Meta:
        model = ChatParticipant
        fields = ['id', 'user', 'user_detail', 'role', 'left_at', 'created_at']


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'chatroom', 'sender', 'message_type', 'content', 'read_by', 'created_at']
        read_only_fields = ['sender']


class ChatRoomSerializer(serializers.ModelSerializer):
    product_detail = ProductSerializer(source='product', read_only=True)
    participants = ChatParticipantSerializer(many=True, read_only=True)

    class Meta:
        model = ChatRoom
        fields = ['id', 'product', 'product_detail', 'status', 'participants', 'created_at', 'updated_at']


class TradeVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradeVerification
        fields = [
            'id',
            'chatroom',
            'verifier_a',
            'verifier_b',
            'verification_type',
            'status',
            'verified_at',
            'created_at',
            'updated_at',
        ]


class VerificationStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = VerificationStep
        fields = ['id', 'chatroom', 'user', 'hop_index', 'side', 'created_at']
        read_only_fields = ['user', 'chatroom']


class NotificationSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSetting
        fields = ['chat_enabled', 'trade_enabled']


class ReportSerializer(serializers.ModelSerializer):
    reporter = UserSerializer(read_only=True)

    class Meta:
        model = Report
        fields = ['id', 'reporter', 'target_type', 'target_id', 'reason', 'status', 'created_at', 'updated_at']
        read_only_fields = ['reporter', 'status']
