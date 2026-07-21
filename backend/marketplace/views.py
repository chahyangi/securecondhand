from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.storage import default_storage
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import pagination, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

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
from .serializers import (
    CategorySerializer,
    ChatMessageSerializer,
    ChatParticipantSerializer,
    ChatRoomSerializer,
    FriendRequestSerializer,
    NotificationSettingSerializer,
    ProductImageSerializer,
    ProductSerializer,
    ProfileSerializer,
    ReportSerializer,
    TradeVerificationSerializer,
    UserSerializer,
    VerificationStepSerializer,
    WishlistSerializer,
)


class ProductPagination(pagination.PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 60


class IsStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class SignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = (request.data.get('username') or '').strip()
        password = request.data.get('password') or ''
        nickname = (request.data.get('nickname') or '').strip() or username

        if not username or not password:
            return Response({'detail': '아이디와 비밀번호를 입력해주세요.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=username).exists():
            return Response({'detail': '이미 사용 중인 아이디예요.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(password)
        except DjangoValidationError as exc:
            return Response({'detail': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password)
        Profile.objects.create(user=user, nickname=nickname)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserSerializer(user).data}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = (request.data.get('username') or '').strip()
        password = request.data.get('password') or ''
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response({'detail': '아이디 또는 비밀번호가 올바르지 않아요.'}, status=status.HTTP_400_BAD_REQUEST)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserSerializer(user).data})


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request.user.auth_token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password') or ''
        new_password = request.data.get('new_password') or ''
        if not request.user.check_password(current_password):
            return Response({'detail': '현재 비밀번호가 올바르지 않아요.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(new_password, user=request.user)
        except DjangoValidationError as exc:
            return Response({'detail': ' '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        request.user.auth_token.delete()
        token = Token.objects.create(user=request.user)
        return Response({'token': token.key})


class DeleteAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserLookupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        username = (request.query_params.get('username') or '').strip()
        if not username:
            return Response({'detail': 'username 쿼리 파라미터가 필요해요.'}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.select_related('profile').filter(username=username).exclude(pk=request.user.pk).first()
        if user is None:
            return Response({'detail': '해당 사용자를 찾을 수 없어요.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserSerializer(user).data)


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        owner = getattr(obj, 'seller', None) or getattr(obj, 'user', None) or getattr(obj, 'reporter', None)
        return owner == request.user


class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.select_related('user').all()
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=False, methods=['get', 'patch'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user, defaults={'nickname': request.user.username})
        if request.method == 'PATCH':
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(self.get_serializer(profile).data)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    pagination_class = ProductPagination

    def get_queryset(self):
        queryset = Product.objects.select_related('seller', 'seller__profile', 'category').prefetch_related('images')
        q = self.request.query_params.get('q')
        category = self.request.query_params.get('category')
        trade_type = self.request.query_params.get('trade_type')
        status_value = self.request.query_params.get('status')
        sort = self.request.query_params.get('sort', 'latest')

        if q:
            queryset = queryset.filter(Q(title__icontains=q) | Q(description__icontains=q))
        if category:
            queryset = queryset.filter(category__name=category)
        if trade_type:
            queryset = queryset.filter(trade_type=trade_type)
        if status_value:
            queryset = queryset.filter(status=status_value)
        if sort == 'popular':
            queryset = queryset.order_by('-wishlists__created_at', '-created_at')
        else:
            queryset = queryset.order_by('-created_at')
        return queryset.distinct()

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsOwnerOrReadOnly])
    def images(self, request, pk=None):
        product = self.get_object()
        serializer = ProductImageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(product=product)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=['patch'],
        url_path='images/order',
        permission_classes=[permissions.IsAuthenticated, IsOwnerOrReadOnly],
    )
    def reorder_images(self, request, pk=None):
        product = self.get_object()
        order_list = request.data if isinstance(request.data, list) else request.data.get('images', [])
        images = {image.id: image for image in product.images.all()}
        touched = [
            (images[entry['id']], entry) for entry in order_list if entry.get('id') in images
        ]
        # (product, order)에 유니크 제약이 있어서 순서를 맞바꿀 때 중간에 값이 겹칠 수 있다.
        # order는 PositiveSmallIntegerField라 음수를 못 쓰므로, 절대 겹치지 않을 큰 값을
        # 임시로 거쳐갔다가 최종 값을 저장해서 충돌을 피한다.
        for offset, (image, _entry) in enumerate(touched):
            image.order = 10000 + offset
            image.save(update_fields=['order', 'updated_at'])
        for image, entry in touched:
            image.order = entry.get('order', image.order)
            image.is_representative = bool(entry.get('is_representative', image.is_representative))
            image.save(update_fields=['order', 'is_representative', 'updated_at'])
        return Response(ProductImageSerializer(product.images.all(), many=True).data)

    @action(detail=True, methods=['delete'], url_path=r'images/(?P<image_id>\d+)', permission_classes=[permissions.IsAuthenticated, IsOwnerOrReadOnly])
    def delete_image(self, request, pk=None, image_id=None):
        product = self.get_object()
        image = product.images.filter(id=image_id).first()
        if image is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        image.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAuthenticated, IsOwnerOrReadOnly])
    def status(self, request, pk=None):
        product = self.get_object()
        product.status = request.data.get('status', product.status)
        product.save(update_fields=['status', 'updated_at'])
        return Response(self.get_serializer(product).data)


class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related('product', 'product__category', 'product__seller')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FriendRequestViewSet(viewsets.ModelViewSet):
    serializer_class = FriendRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FriendRequest.objects.filter(Q(requester=self.request.user) | Q(receiver=self.request.user)).select_related(
            'requester',
            'requester__profile',
            'receiver',
            'receiver__profile',
        )

    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.id != instance.receiver_id:
            return Response({'detail': '요청을 받은 사람만 수락/거절할 수 있어요.'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def accepted(self, request):
        accepted_requests = self.get_queryset().filter(status=FriendRequest.Status.ACCEPTED)
        friends = [
            (r.receiver if r.requester_id == request.user.id else r.requester) for r in accepted_requests
        ]
        return Response(UserSerializer(friends, many=True).data)


def broadcast_system_message(chatroom, content):
    message = ChatMessage.objects.create(
        chatroom=chatroom,
        sender=None,
        message_type=ChatMessage.MessageType.SYSTEM,
        content=content,
    )
    channel_layer = get_channel_layer()
    if channel_layer is not None:
        async_to_sync(channel_layer.group_send)(
            f'chat_{chatroom.id}',
            {'type': 'chat_message', 'message': ChatMessageSerializer(message).data},
        )
    return message


class ChatRoomViewSet(viewsets.ModelViewSet):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ChatRoom.objects.filter(participants__user=self.request.user).select_related('product').prefetch_related('participants')

    def create(self, request, *args, **kwargs):
        product_id = request.data.get('product')
        if not product_id:
            return Response({'detail': 'product는 필수예요.'}, status=status.HTTP_400_BAD_REQUEST)
        product = get_object_or_404(Product.objects.select_related('seller'), pk=product_id)

        # 이미 참여 중인 방이 있으면(판매자가 나중에 들어오는 경우 포함) 그대로 반환.
        chatroom = ChatRoom.objects.filter(product=product, participants__user=request.user).first()
        if chatroom is not None:
            return Response(self.get_serializer(chatroom).data, status=status.HTTP_200_OK)

        # 새로 만드는 건 "구매자가 채팅을 시작하는" 흐름만 허용한다.
        if product.seller_id == request.user.id:
            return Response({'detail': '본인 상품에는 채팅을 시작할 수 없어요.'}, status=status.HTTP_400_BAD_REQUEST)

        chatroom = ChatRoom.objects.create(product=product)
        ChatParticipant.objects.create(chatroom=chatroom, user=request.user, role=ChatParticipant.Role.BUYER)
        ChatParticipant.objects.create(chatroom=chatroom, user=product.seller, role=ChatParticipant.Role.SELLER)

        serializer = self.get_serializer(chatroom)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def participants(self, request, pk=None):
        chatroom = self.get_object()
        if chatroom.participants.filter(left_at__isnull=True).count() >= 4:
            return Response({'detail': '채팅방은 최대 4인까지 참여할 수 있습니다.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = ChatParticipantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        participant = serializer.save(chatroom=chatroom)
        broadcast_system_message(
            chatroom, f'{participant.user.profile.nickname}님이 {participant.get_role_display()}(으)로 참여했어요.'
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path=r'participants/(?P<user_id>\d+)')
    def leave(self, request, pk=None, user_id=None):
        chatroom = self.get_object()
        participant = chatroom.participants.filter(user_id=user_id, left_at__isnull=True).first()
        if participant is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        participant.left_at = timezone.now()
        participant.save(update_fields=['left_at', 'updated_at'])
        broadcast_system_message(chatroom, f'{participant.user.profile.nickname}님이 채팅방을 나갔어요.')
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        chatroom = self.get_object()
        if request.method == 'POST':
            serializer = ChatMessageSerializer(data={**request.data, 'chatroom': chatroom.id})
            serializer.is_valid(raise_exception=True)
            serializer.save(chatroom=chatroom, sender=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        messages = chatroom.messages.select_related('sender', 'sender__profile').order_by('created_at')
        return Response(ChatMessageSerializer(messages, many=True).data)

    @action(detail=True, methods=['post'], url_path='images')
    def upload_image(self, request, pk=None):
        chatroom = self.get_object()
        image_file = request.FILES.get('image')
        if image_file is None:
            return Response({'detail': 'image 파일이 필요해요.'}, status=status.HTTP_400_BAD_REQUEST)

        path = default_storage.save(f'chat/{chatroom.id}/{image_file.name}', image_file)
        return Response({'url': default_storage.url(path)}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'], url_path='verification')
    def verification(self, request, pk=None):
        chatroom = self.get_object()
        if request.method == 'GET':
            steps = chatroom.verification_steps.all()
            verifications = chatroom.trade_verifications.all()
            return Response({
                'steps': VerificationStepSerializer(steps, many=True).data,
                'verifications': TradeVerificationSerializer(verifications, many=True).data,
            })

        hop_index = request.data.get('hop_index')
        side = request.data.get('side')
        from_user_id = request.data.get('from_user')
        to_user_id = request.data.get('to_user')
        is_last_hop = bool(request.data.get('is_last_hop'))
        if hop_index is None or side not in VerificationStep.Side.values:
            return Response({'detail': 'hop_index, side가 필요해요.'}, status=status.HTTP_400_BAD_REQUEST)

        step, _created = VerificationStep.objects.get_or_create(
            chatroom=chatroom, hop_index=hop_index, side=side,
            defaults={'user': request.user},
        )

        hop_done = (
            chatroom.verification_steps.filter(hop_index=hop_index, side=VerificationStep.Side.GIVE).exists()
            and chatroom.verification_steps.filter(hop_index=hop_index, side=VerificationStep.Side.RECEIVE).exists()
        )

        verification = None
        if hop_done and from_user_id and to_user_id:
            verification, _created = TradeVerification.objects.get_or_create(
                chatroom=chatroom,
                verifier_a_id=from_user_id,
                verifier_b_id=to_user_id,
                verification_type=(
                    TradeVerification.VerificationType.TRADE if is_last_hop else TradeVerification.VerificationType.HANDOVER
                ),
                defaults={'status': TradeVerification.Status.MANUAL, 'verified_at': timezone.now()},
            )
            chatroom.status = ChatRoom.Status.CONFIRMED if is_last_hop else ChatRoom.Status.HANDOVER_DONE
            chatroom.save(update_fields=['status', 'updated_at'])

        channel_layer = get_channel_layer()
        if channel_layer is not None:
            async_to_sync(channel_layer.group_send)(
                f'chat_{chatroom.id}',
                {
                    'type': 'verification_event',
                    'payload': {
                        'kind': 'verification_step',
                        'hop_index': step.hop_index,
                        'side': step.side,
                        'user_id': step.user_id,
                    },
                },
            )

        return Response(
            {
                'step': VerificationStepSerializer(step).data,
                'hop_done': hop_done,
                'verification': TradeVerificationSerializer(verification).data if verification else None,
            },
            status=status.HTTP_201_CREATED,
        )


class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Report.objects.filter(reporter=self.request.user)

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)


class NotificationSettingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        setting, _ = NotificationSetting.objects.get_or_create(user=request.user)
        return Response(NotificationSettingSerializer(setting).data)

    def patch(self, request):
        setting, _ = NotificationSetting.objects.get_or_create(user=request.user)
        serializer = NotificationSettingSerializer(setting, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AdminUserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.select_related('profile').order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsStaffUser]

    @action(detail=True, methods=['patch'])
    def suspend(self, request, pk=None):
        target = self.get_object()
        target.is_active = not target.is_active
        target.save(update_fields=['is_active'])
        return Response(UserSerializer(target).data)


class AdminProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.select_related('seller', 'category').prefetch_related('images').order_by('-created_at')
    serializer_class = ProductSerializer
    permission_classes = [IsStaffUser]
    pagination_class = ProductPagination

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminReportViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Report.objects.select_related('reporter', 'reporter__profile').order_by('-created_at')
    serializer_class = ReportSerializer
    permission_classes = [IsStaffUser]

    @action(detail=True, methods=['patch'])
    def resolve(self, request, pk=None):
        report = self.get_object()
        report.status = Report.Status.RESOLVED
        report.save(update_fields=['status', 'updated_at'])
        return Response(ReportSerializer(report).data)


class AdminStatsView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        return Response({
            'users': {
                'total': User.objects.count(),
                'active': User.objects.filter(is_active=True).count(),
            },
            'products': {
                'total': Product.objects.count(),
                'on_sale': Product.objects.filter(status=Product.Status.ON_SALE).count(),
                'reserved': Product.objects.filter(status=Product.Status.RESERVED).count(),
                'sold': Product.objects.filter(status=Product.Status.SOLD).count(),
            },
            'reports': {
                'pending': Report.objects.filter(status=Report.Status.PENDING).count(),
                'resolved': Report.objects.filter(status=Report.Status.RESOLVED).count(),
            },
            'chatrooms': ChatRoom.objects.count(),
        })
