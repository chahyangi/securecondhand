from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Profile(TimeStampedModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    nickname = models.CharField(max_length=40)
    icon = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.nickname


class FriendRequest(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = 'pending', '대기'
        ACCEPTED = 'accepted', '수락'
        REJECTED = 'rejected', '거절'

    requester = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_friend_requests')
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_friend_requests')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['requester', 'receiver'], name='unique_friend_request_pair'),
            models.CheckConstraint(check=~models.Q(requester=models.F('receiver')), name='prevent_self_friend_request'),
        ]


class Category(models.Model):
    name = models.CharField(max_length=40, unique=True)

    def __str__(self):
        return self.name


class Product(TimeStampedModel):
    class Condition(models.TextChoices):
        NEW = 'new', '미개봉'
        OPENED = 'opened', '개봉후 미사용'
        USED = 'used', '사용감 있음'

    class TradeType(models.TextChoices):
        DIRECT = 'direct', '직거래'
        DELIVERY = 'delivery', '택배'

    class Status(models.TextChoices):
        ON_SALE = 'on_sale', '판매중'
        RESERVED = 'reserved', '예약중'
        SOLD = 'sold', '판매완료'

    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='products')
    title = models.CharField(max_length=120)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    condition = models.CharField(max_length=20, choices=Condition.choices)
    trade_type = models.CharField(max_length=20, choices=TradeType.choices)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ON_SALE)

    class Meta:
        indexes = [
            models.Index(fields=['seller']),
            models.Index(fields=['category']),
            models.Index(fields=['status']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return self.title


class ProductImage(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/%Y/%m/%d/')
    order = models.PositiveSmallIntegerField(default=0)
    is_representative = models.BooleanField(default=False)

    class Meta:
        ordering = ['order', 'id']
        constraints = [
            models.UniqueConstraint(fields=['product', 'order'], name='unique_product_image_order'),
        ]


class Wishlist(TimeStampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wishlists')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='wishlists')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'product'], name='unique_wishlist_user_product'),
        ]


class ChatRoom(TimeStampedModel):
    class Status(models.TextChoices):
        NEGOTIATING = 'negotiating', '협의중'
        HANDOVER_DONE = 'handover_done', '인계완료'
        CONFIRMED = 'confirmed', '거래확정'
        DONE = 'done', '거래완료'

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='chatrooms')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEGOTIATING)


class ChatParticipant(TimeStampedModel):
    class Role(models.TextChoices):
        BUYER = 'buyer', '구매자'
        SELLER = 'seller', '판매자'
        AGENT = 'agent', '대리인'

    chatroom = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_participations')
    role = models.CharField(max_length=20, choices=Role.choices)
    left_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['chatroom', 'user'], name='unique_chatroom_participant'),
        ]


class ChatMessage(TimeStampedModel):
    class MessageType(models.TextChoices):
        TEXT = 'text', '텍스트'
        IMAGE = 'image', '이미지'
        SYSTEM = 'system', '시스템'

    chatroom = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='chat_messages')
    message_type = models.CharField(max_length=20, choices=MessageType.choices, default=MessageType.TEXT)
    content = models.TextField()
    read_by = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='read_messages')

    class Meta:
        indexes = [
            models.Index(fields=['chatroom', 'created_at']),
        ]


class TradeVerification(TimeStampedModel):
    class VerificationType(models.TextChoices):
        HANDOVER = 'handover', '물건 인계'
        TRADE = 'trade', '대면 거래'

    class Status(models.TextChoices):
        PENDING = 'pending', '대기중'
        MANUAL = 'manual', '수동확인'

    chatroom = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='trade_verifications')
    verifier_a = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='verifications_as_a')
    verifier_b = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='verifications_as_b')
    verification_type = models.CharField(max_length=20, choices=VerificationType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    verified_at = models.DateTimeField(null=True, blank=True)


class VerificationStep(TimeStampedModel):
    class Side(models.TextChoices):
        GIVE = 'give', '인계'
        RECEIVE = 'receive', '인수'

    chatroom = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='verification_steps')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='verification_steps')
    hop_index = models.PositiveSmallIntegerField()
    side = models.CharField(max_length=10, choices=Side.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['chatroom', 'hop_index', 'side'], name='unique_verification_step'),
        ]


class NotificationSetting(TimeStampedModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_setting')
    chat_enabled = models.BooleanField(default=True)
    trade_enabled = models.BooleanField(default=True)


class Report(TimeStampedModel):
    class TargetType(models.TextChoices):
        USER = 'user', '사용자'
        PRODUCT = 'product', '상품'

    class Status(models.TextChoices):
        PENDING = 'pending', '대기'
        RESOLVED = 'resolved', '처리완료'

    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reports')
    target_type = models.CharField(max_length=20, choices=TargetType.choices)
    target_id = models.PositiveBigIntegerField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
