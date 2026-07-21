// 백엔드 연동 전 임시 데이터.
// Django API 연동 시 이 파일 대신 fetch('/api/...') 결과를 사용.

export const CONDITIONS = {
  new: '미개봉',
  opened: '개봉후 미사용',
  used: '사용감 있음',
}

export const CATEGORIES = ['전체', '디지털기기', '가구/인테리어', '의류', '도서', '스포츠', '생활용품', '취미/게임']

export const products = [
  { id: 'p1', title: '에어팟 프로 2세대', category: '디지털기기', condition: 'opened', tradeType: '직거래', colors: ['#B5D4F4', '#85B7EB'], desc: '2주 사용했습니다. 케이스 흠집 없고 박스, 충전 케이블 모두 포함이에요.', createdAt: '2026.07.01', updatedAt: '2026.07.05', sellerId: 'u2', status: '판매중' },
  { id: 'p2', title: '원목 스탠드 조명', category: '가구/인테리어', condition: 'used', tradeType: '택배', colors: ['#FAC775', '#EF9F27'], desc: '이사로 인해 판매합니다. 조도 3단계 조절 가능해요.', createdAt: '2026.06.28', updatedAt: '2026.06.28', sellerId: 'u3', status: '판매중' },
  { id: 'p3', title: '운동화 260', category: '의류', condition: 'used', tradeType: '직거래', colors: ['#9FE1CB', '#5DCAA5'], desc: '몇 번 안 신었어요. 사이즈가 안 맞아서 판매합니다.', createdAt: '2026.07.02', updatedAt: '2026.07.02', sellerId: 'u4', status: '판매중' },
  { id: 'p4', title: '1인용 패브릭 소파', category: '가구/인테리어', condition: 'used', tradeType: '직거래', colors: ['#F5C4B3', '#F0997B'], desc: '얼룩 없고 상태 좋습니다. 직접 보고 결정하세요.', createdAt: '2026.06.20', updatedAt: '2026.06.30', sellerId: 'u5', status: '예약중' },
  { id: 'p5', title: '전공 서적 세트', category: '도서', condition: 'used', tradeType: '택배', colors: ['#CECBF6', '#AFA9EC'], desc: '컴퓨터공학 전공서적 5권 일괄 판매합니다.', createdAt: '2026.06.25', updatedAt: '2026.06.25', sellerId: 'u2', status: '판매중' },
  { id: 'p6', title: '카메라 삼각대', category: '취미/게임', condition: 'new', tradeType: '택배', colors: ['#F4C0D1', '#ED93B1'], desc: '미개봉 새제품입니다. 선물 받았는데 쓸 일이 없네요.', createdAt: '2026.07.06', updatedAt: '2026.07.06', sellerId: 'u3', status: '판매중' },
  { id: 'p7', title: '자전거 헬멧', category: '스포츠', condition: 'opened', tradeType: '직거래', colors: ['#C0DD97', '#97C459'], desc: '착용 1회, 사이즈 M입니다.', createdAt: '2026.06.29', updatedAt: '2026.06.29', sellerId: 'u4', status: '판매중' },
  { id: 'p8', title: '머그컵 세트', category: '생활용품', condition: 'new', tradeType: '직거래', colors: ['#D3D1C7', '#B4B2A9'], desc: '미개봉 4개 세트입니다.', createdAt: '2026.07.03', updatedAt: '2026.07.03', sellerId: 'u5', status: '판매완료' },
  { id: 'p9', title: '게이밍 모니터', category: '디지털기기', condition: 'used', tradeType: '직거래', colors: ['#85B7EB', '#378ADD'], desc: '3년 사용, 정상 작동합니다. 뒷면에 스크래치 약간 있어요.', createdAt: '2026.06.15', updatedAt: '2026.07.01', sellerId: 'u2', status: '판매중' },
]

export const users = {
  me: { id: 'me', nickname: '나', icon: '나' },
  u2: { id: 'u2', nickname: '민지', icon: '민' },
  u3: { id: 'u3', nickname: '태오', icon: '태' },
  u4: { id: 'u4', nickname: '수아', icon: '수' },
  u5: { id: 'u5', nickname: '현우', icon: '현' },
}

export const friends = [
  { id: 'u3', nickname: '태오', icon: '태' },
  { id: 'u4', nickname: '수아', icon: '수' },
]

export const initialMessages = [
  { id: 'm1', senderId: 'u2', type: 'text', content: '안녕하세요! 아직 판매 중인가요?', time: '오후 2:01' },
  { id: 'm2', senderId: 'me', type: 'text', content: '네 가능합니다! 오늘 저녁에 직거래 가능하실까요?', time: '오후 2:03' },
  { id: 'm3', senderId: 'u2', type: 'text', content: '좋아요, 7시에 역 앞에서 뵐게요.', time: '오후 2:04' },
]
