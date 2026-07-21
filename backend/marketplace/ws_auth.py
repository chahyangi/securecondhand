from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def get_user_from_token(token_key):
    from rest_framework.authtoken.models import Token

    if not token_key:
        return AnonymousUser()
    try:
        return Token.objects.select_related('user').get(key=token_key).user
    except Token.DoesNotExist:
        return AnonymousUser()


class TokenAuthMiddleware:
    """브라우저 WebSocket API는 커스텀 헤더를 못 보내므로, 쿼리스트링(?token=...)으로
    DRF 토큰을 받아 scope['user']를 채운다."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        token_key = parse_qs(query_string).get('token', [None])[0]
        scope['user'] = await get_user_from_token(token_key)
        return await self.app(scope, receive, send)


def TokenAuthMiddlewareStack(inner):
    return TokenAuthMiddleware(inner)
