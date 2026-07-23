from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminProductViewSet,
    AdminReportViewSet,
    AdminStatsView,
    AdminUserViewSet,
    CategoryViewSet,
    ChangePasswordView,
    ChatRoomViewSet,
    DeleteAccountView,
    FriendRequestViewSet,
    LoginView,
    LogoutView,
    NotificationFeedView,
    NotificationSettingView,
    PaymentConfigView,
    PaymentOrderViewSet,
    ProductViewSet,
    ProfileViewSet,
    ReportViewSet,
    SignupView,
    TransferViewSet,
    UserLookupView,
    WishlistViewSet,
)


router = DefaultRouter()
router.register('profiles', ProfileViewSet, basename='profile')
router.register('categories', CategoryViewSet, basename='category')
router.register('products', ProductViewSet, basename='product')
router.register('wishlists', WishlistViewSet, basename='wishlist')
router.register('friends/requests', FriendRequestViewSet, basename='friend-request')
router.register('chatrooms', ChatRoomViewSet, basename='chatroom')
router.register('reports', ReportViewSet, basename='report')
router.register('transfers', TransferViewSet, basename='transfer')
router.register('payments/orders', PaymentOrderViewSet, basename='payment-order')
router.register('admin/users', AdminUserViewSet, basename='admin-user')
router.register('admin/products', AdminProductViewSet, basename='admin-product')
router.register('admin/reports', AdminReportViewSet, basename='admin-report')

urlpatterns = [
    path('auth/signup/', SignupView.as_view(), name='auth-signup'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('users/me/', DeleteAccountView.as_view(), name='users-me-delete'),
    path('users/lookup/', UserLookupView.as_view(), name='users-lookup'),
    path('notifications/settings/', NotificationSettingView.as_view(), name='notification-settings'),
    path('notifications/feed/', NotificationFeedView.as_view(), name='notification-feed'),
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('payments/config/', PaymentConfigView.as_view(), name='payment-config'),
    path('', include(router.urls)),
]
