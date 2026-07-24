import logging
import math

from rest_framework.exceptions import Throttled
from rest_framework.views import exception_handler as drf_exception_handler

security_logger = logging.getLogger('django.security')


def logging_exception_handler(exc, context):
    """DRF는 401/403/429 같은 인증·인가 실패를 예외를 그대로 올리지 않고 자체적으로
    Response로 변환하므로, django.request 로거를 거치지 않아 아무 데도 기록되지 않는다.
    여기서 가로채서 최소한 콘솔에라도 남긴다 (보안점검.md A09)."""
    response = drf_exception_handler(exc, context)

    # DRF 기본 Throttled 메시지("Request was throttled. Expected available in N seconds.")는
    # 로케일 설정과 무관하게 영어로 나가서, 프론트에 영어가 섞여 보였다. 완전한 한글 문구로 교체.
    if isinstance(exc, Throttled) and response is not None:
        wait = math.ceil(exc.wait) if exc.wait is not None else None
        detail = (
            f'요청이 너무 잦아요. {wait}초 후 다시 시도해주세요.'
            if wait is not None
            else '요청이 너무 잦아요. 잠시 후 다시 시도해주세요.'
        )
        response.data = {'detail': detail}

    if response is not None and response.status_code in (401, 403, 429):
        request = context.get('request')
        user = getattr(request, 'user', None)
        who = getattr(user, 'username', None) or 'anonymous'
        path = getattr(request, 'path', '?')
        security_logger.warning(
            '%s %s user=%s path=%s', response.status_code, exc.__class__.__name__, who, path
        )
    return response
