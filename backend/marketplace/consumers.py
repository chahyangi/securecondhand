import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from .models import ChatMessage, ChatParticipant, ChatRoom, create_notifications_for_message
from .serializers import ChatMessageSerializer


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.group_name = f'chat_{self.room_id}'

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4401)
            return

        is_member = await self.is_participant()
        if not is_member:
            await self.close(code=4403)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            payload = json.loads(text_data)
        except (TypeError, ValueError):
            return

        content = (payload.get('content') or '').strip()
        message_type = payload.get('message_type') or ChatMessage.MessageType.TEXT
        if not content:
            return

        message_data = await self.save_message(content, message_type)
        await self.channel_layer.group_send(
            self.group_name,
            {'type': 'chat_message', 'message': message_data},
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event['message']))

    async def verification_event(self, event):
        await self.send(text_data=json.dumps(event['payload']))

    @database_sync_to_async
    def is_participant(self):
        return ChatParticipant.objects.filter(
            chatroom_id=self.room_id, user=self.user, left_at__isnull=True
        ).exists()

    @database_sync_to_async
    def save_message(self, content, message_type):
        room = ChatRoom.objects.get(pk=self.room_id)
        message = ChatMessage.objects.create(
            chatroom=room,
            sender=self.user,
            message_type=message_type,
            content=content,
        )
        create_notifications_for_message(message)
        return ChatMessageSerializer(message).data
