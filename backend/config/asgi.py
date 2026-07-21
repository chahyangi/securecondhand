import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Django ASGI 앱은 다른 채널스 관련 모듈(모델을 임포트하는 라우팅/컨슈머)보다
# 먼저 초기화해야 앱 레지스트리가 준비된 상태로 임포트가 이뤄진다.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import AllowedHostsOriginValidator  # noqa: E402

from marketplace.routing import websocket_urlpatterns  # noqa: E402
from marketplace.ws_auth import TokenAuthMiddlewareStack  # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        TokenAuthMiddlewareStack(URLRouter(websocket_urlpatterns))
    ),
})
