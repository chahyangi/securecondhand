from django.contrib.auth.models import User
from rest_framework import serializers

from .models import (
    Category,
    ChatMessage,
    ChatParticipant,
    ChatRoom,
    FriendRequest,
    Notification,
    NotificationSetting,
    Product,
    ProductImage,
    Profile,
    PaymentOrder,
    Report,
    TradeVerification,
    Transfer,
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
        fields = ['id', 'user', 'nickname', 'icon', 'balance', 'created_at', 'updated_at']
        read_only_fields = ['balance']


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
            'price',
            'status',
            'is_blocked',
            'images',
            'wish_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['seller', 'is_blocked']


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
        # role은 클라이언트 입력을 받지 않는다 — ChatRoomViewSet.participants가 초대자의
        # 역할(판매자/구매자)을 보고 서버에서 직접 정해서 save(role=...)로 넣어준다.
        read_only_fields = ['role']


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)

    class Meta:
        model = ChatMessage
        fields = ['id', 'chatroom', 'sender', 'message_type', 'content', 'read_by', 'created_at']
        read_only_fields = ['sender']


class ChatRoomSerializer(serializers.ModelSerializer):
    product_detail = ProductSerializer(source='product', read_only=True)
    participants = ChatParticipantSerializer(many=True, read_only=True)
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ['id', 'product', 'product_detail', 'status', 'participants', 'unread_count', 'created_at', 'updated_at']

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request is None or not request.user.is_authenticated:
            return 0
        return obj.messages.exclude(sender=request.user).exclude(read_by=request.user).count()


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


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'kind', 'content', 'chatroom', 'is_read', 'created_at']


class ReportSerializer(serializers.ModelSerializer):
    reporter = UserSerializer(read_only=True)

    class Meta:
        model = Report
        fields = ['id', 'reporter', 'target_type', 'target_id', 'reason', 'status', 'created_at', 'updated_at']
        read_only_fields = ['reporter', 'status']


class TransferSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)
    receiver_username = serializers.CharField(write_only=True)

    class Meta:
        model = Transfer
        fields = ['id', 'sender', 'receiver', 'receiver_username', 'amount', 'memo', 'chatroom', 'created_at']
        read_only_fields = ['sender', 'receiver']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('송금액은 1원 이상이어야 해요.')
        return value


class PaymentOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentOrder
        fields = ['order_id', 'amount', 'status', 'created_at']
        read_only_fields = ['order_id', 'status', 'created_at']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('충전 금액은 1원 이상이어야 해요.')
        return value
