from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from marketplace.models import Category, Product, Profile


PRODUCTS = [
    ('에어팟 프로 2세대', '디지털기기', 'opened', 'direct', '2주 사용했습니다. 케이스 흠집 없고 박스, 충전 케이블 모두 포함이에요.', 'on_sale'),
    ('원목 스탠드 조명', '가구/인테리어', 'used', 'delivery', '이사로 인해 판매합니다. 조도 3단계 조절 가능해요.', 'on_sale'),
    ('운동화 260', '의류', 'used', 'direct', '몇 번 안 신었어요. 사이즈가 안 맞아서 판매합니다.', 'on_sale'),
    ('1인용 패브릭 소파', '가구/인테리어', 'used', 'direct', '얼룩 없고 상태 좋습니다. 직접 보고 결정하세요.', 'reserved'),
    ('전공 서적 세트', '도서', 'used', 'delivery', '컴퓨터공학 전공서적 5권 일괄 판매합니다.', 'on_sale'),
    ('카메라 삼각대', '취미/게임', 'new', 'delivery', '미개봉 새제품입니다. 선물 받았는데 쓸 일이 없네요.', 'on_sale'),
    ('자전거 헬멧', '스포츠', 'opened', 'direct', '착용 1회, 사이즈 M입니다.', 'on_sale'),
    ('머그컵 세트', '생활용품', 'new', 'direct', '미개봉 4개 세트입니다.', 'sold'),
    ('게이밍 모니터', '디지털기기', 'used', 'direct', '3년 사용, 정상 작동합니다. 뒷면에 스크래치 약간 있어요.', 'on_sale'),
]


class Command(BaseCommand):
    help = 'Create demo users, categories, and products.'

    def handle(self, *args, **options):
        seller, _ = User.objects.get_or_create(username='demo_seller', defaults={'email': 'seller@example.com'})
        seller.set_unusable_password()
        seller.save()
        Profile.objects.get_or_create(user=seller, defaults={'nickname': '민지', 'icon': '민'})

        for name in ['디지털기기', '가구/인테리어', '의류', '도서', '스포츠', '생활용품', '취미/게임']:
            Category.objects.get_or_create(name=name)

        created = 0
        for title, category_name, condition, trade_type, description, status in PRODUCTS:
            category = Category.objects.get(name=category_name)
            _, was_created = Product.objects.get_or_create(
                title=title,
                seller=seller,
                defaults={
                    'category': category,
                    'condition': condition,
                    'trade_type': trade_type,
                    'description': description,
                    'status': status,
                },
            )
            created += int(was_created)

        self.stdout.write(self.style.SUCCESS(f'Demo data ready. Created {created} products.'))
