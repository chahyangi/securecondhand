import uuid

from django.conf import settings
from django.db import models


def _generate_order_id():
    return uuid.uuid4().hex


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Profile(TimeStampedModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    nickname = models.CharField(max_length=40)
    icon = models.CharField(max_length=255, blank=True)
    # 실제 PG 연동 없이 유저 간 송금 요구사항을 충족하기 위한 내부 포인트성 잔액.
    balance = models.PositiveIntegerField(default=1_000_000)

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
            models.CheckConstraint(condition=~models.Q(requester=models.F('receiver')), name='prevent_self_friend_request'),
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
    price = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ON_SALE)
    # 신고 누적으로 자동 차단된 상품. 관리자가 강제 삭제하는 것과 별개로, 목록/상세에서
    # 일반 사용자에게 보이지 않게 되는 자동 조치.
    is_blocked = models.BooleanField(default=False)

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


class Transfer(TimeStampedModel):
    """유저 간 송금 원장(ledger). 실제 결제 PG 없이 내부 포인트성 잔액(Profile.balance)을
    주고받는 기록이며, 생성 후에는 수정/삭제하지 않는다(감사 추적을 위해 불변으로 유지)."""

    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_transfers')
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_transfers')
    amount = models.PositiveIntegerField()
    memo = models.CharField(max_length=200, blank=True)
    chatroom = models.ForeignKey(ChatRoom, on_delete=models.SET_NULL, null=True, blank=True, related_name='transfers')

    class Meta:
        indexes = [
            models.Index(fields=['sender', '-created_at']),
            models.Index(fields=['receiver', '-created_at']),
        ]
        constraints = [
            models.CheckConstraint(condition=models.Q(amount__gt=0), name='transfer_amount_positive'),
            models.CheckConstraint(condition=~models.Q(sender=models.F('receiver')), name='prevent_self_transfer'),
        ]


class PaymentOrder(TimeStampedModel):
    """토스페이먼츠 결제위젯(테스트 연동)으로 지갑을 충전하는 주문 기록.

    금액은 결제창을 띄우기 전에 서버가 먼저 이 레코드에 기록해두고, 결제 승인(confirm) 시
    토스가 돌려준 금액과 이 값을 대조한다 — 클라이언트가 위젯 호출을 조작해 실제 결제한 금액보다
    큰 금액을 충전하려는 시도를 막기 위함. status는 pending에서 시작해 confirm 성공 시 confirmed로
    바뀌며, 이미 confirmed인 주문을 다시 confirm 요청해도 잔액이 중복 적립되지 않는다(멱등성)."""

    class Status(models.TextChoices):
        PENDING = 'pending', '대기중'
        CONFIRMED = 'confirmed', '승인완료'
        FAILED = 'failed', '실패'

    order_id = models.CharField(max_length=64, unique=True, default=_generate_order_id, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payment_orders')
    amount = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_key = models.CharField(max_length=200, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]
