from django.contrib import admin

from .models import (
    Category,
    ChatMessage,
    ChatParticipant,
    ChatRoom,
    FriendRequest,
    NotificationSetting,
    PaymentOrder,
    Product,
    ProductImage,
    Profile,
    Report,
    TradeVerification,
    Transfer,
    VerificationStep,
    Wishlist,
)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'seller', 'status', 'category', 'created_at']
    list_filter = ['status', 'category', 'trade_type']
    search_fields = ['title', 'description']


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'reporter', 'target_type', 'target_id', 'status', 'created_at']
    list_filter = ['status', 'target_type']


admin.site.register(Profile)
admin.site.register(FriendRequest)
admin.site.register(Category)
admin.site.register(ProductImage)
admin.site.register(Wishlist)
admin.site.register(ChatRoom)
admin.site.register(ChatParticipant)
admin.site.register(ChatMessage)
admin.site.register(TradeVerification)
admin.site.register(VerificationStep)
admin.site.register(NotificationSetting)


@admin.register(Transfer)
class TransferAdmin(admin.ModelAdmin):
    list_display = ['id', 'sender', 'receiver', 'amount', 'created_at']
    list_filter = ['created_at']
    search_fields = ['sender__username', 'receiver__username']


@admin.register(PaymentOrder)
class PaymentOrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'order_id', 'user', 'amount', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['order_id', 'user__username']
