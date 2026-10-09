// 1. 정책 데이터 분리 (세율, 쿠폰 종류)
export const discountPolicies = {
  taxRate: 0.10, // 일본 기본 소비세 10%
  coupons: [
    { label: "없음", rate: 0 },
    { label: "5% 할인", rate: 0.05 },
    { label: "7% 할인", rate: 0.07 }
  ]
};

// 2. 최종 예상 가격 계산 함수
export function calculateFinalPrice(
  basePrice: number,    // 현지에서 입력한 가격
  couponRate: number,   // 쿠폰 할인율 (예: 0.05)
  isTaxFree: boolean    // 면세 적용 여부
): number {
  if (!basePrice || basePrice <= 0) return 0;

  // 1. 쿠폰 할인 먼저 적용
  const priceAfterCoupon = basePrice * (1 - couponRate);

  // 2. 면세가 아니면 세금 10% 추가
  const finalPrice = isTaxFree 
    ? priceAfterCoupon 
    : priceAfterCoupon * (1 + discountPolicies.taxRate);

  return Math.floor(finalPrice); // 일본 엔화는 소수점이 없으므로 버림 처리
}
