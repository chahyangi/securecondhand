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
    NotificationSettingView,
    ProductViewSet,
    ProfileViewSet,
    ReportViewSet,
    SignupView,
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
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('', include(router.urls)),
]
