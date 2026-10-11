export type TaxRate = 0.1 | 0.08;

export const discountPolicies = {
  minimumTaxExcludedPrice: 5000,

  taxRates: [
    {
      label: "일반상품 / 화장품 / 의약품 / 주류 (10%)",
      rate: 0.1 as TaxRate,
    },
    {
      label: "식품 / 무알코올 음료 (8%)",
      rate: 0.08 as TaxRate,
    },
  ],

  coupons: [
    {
      label: "없음",
      rate: 0,
    },
    {
      label: "5% 할인",
      rate: 0.05,
    },
    {
      label: "7% 할인",
      rate: 0.07,
    },
  ],
};

export interface RefundCalculation {
  originalPrice: number;

  // 쿠폰 적용 후 실제 매장 결제 예정 금액
  priceAfterCoupon: number;

  // 세전 예상 금액
  taxExcludedPrice: number;

  // 결제금액에 포함된 소비세 상당액
  includedTax: number;

  // 세전 5,000엔 조건 충족 여부
  meetsMinimum: boolean;

  // 최종 환급 가능 조건 충족 여부
  refundEligible: boolean;

  // 예상 환급액
  estimatedRefund: number;

  // 환급 후 실질 부담액
  finalPriceAfterRefund: number;

  // 세전 5,000엔까지 부족한 금액
  remainingTaxExcluded: number;

  // 현재 세율 기준 대략적인 추가 구매 필요 금액
  estimatedRemainingTaxIncluded: number;
}

export function calculateRefundEstimate(
  basePrice: number,
  couponRate: number,
  taxRate: TaxRate,
  isTaxFreeShop: boolean,
  isSameStoreSameDay: boolean
): RefundCalculation {
  if (!basePrice || basePrice <= 0) {
    return {
      originalPrice: 0,
      priceAfterCoupon: 0,
      taxExcludedPrice: 0,
      includedTax: 0,
      meetsMinimum: false,
      refundEligible: false,
      estimatedRefund: 0,
      finalPriceAfterRefund: 0,
      remainingTaxExcluded:
        discountPolicies.minimumTaxExcludedPrice,
      estimatedRemainingTaxIncluded: 0,
    };
  }

  /*
   * 1. 쿠폰 할인
   *
   * basePrice는 매장에서 표시된
   * "소비세 포함 가격"이라고 가정
   */
  const priceAfterCoupon = Math.floor(
    basePrice * (1 - couponRate)
  );

  /*
   * 2. 세금 포함 가격에서 세전 가격 계산
   *
   * 10% 상품:
   * 11,000 / 1.10 = 10,000
   *
   * 8% 상품:
   * 10,800 / 1.08 = 10,000
   */
  const taxExcludedPrice = Math.floor(
    priceAfterCoupon / (1 + taxRate)
  );

  /*
   * 포함된 소비세 상당액
   */
  const includedTax =
    priceAfterCoupon - taxExcludedPrice;

  /*
   * 2026년 11월 이후
   * 같은 매장 / 같은 날
   * 세전 5,000엔 이상
   */
  const meetsMinimum =
    taxExcludedPrice >=
    discountPolicies.minimumTaxExcludedPrice;

  const refundEligible =
    isTaxFreeShop &&
    isSameStoreSameDay &&
    meetsMinimum;

  /*
   * 환급제에서는 매장에서 우선 세금 포함 가격 결제
   * 출국 확인 후 소비세 상당액 환급
   */
  const estimatedRefund =
    refundEligible
      ? includedTax
      : 0;

  const finalPriceAfterRefund =
    priceAfterCoupon -
    estimatedRefund;

  const remainingTaxExcluded =
    meetsMinimum
      ? 0
      : Math.max(
          0,
          discountPolicies.minimumTaxExcludedPrice -
            taxExcludedPrice
        );

  /*
   * 현재 선택한 세율을 기준으로
   * 면세 기준까지 필요한 추가 구매액 추정
   */
  const estimatedRemainingTaxIncluded =
    remainingTaxExcluded > 0
      ? Math.ceil(
          remainingTaxExcluded *
            (1 + taxRate)
        )
      : 0;

  return {
    originalPrice: basePrice,
    priceAfterCoupon,
    taxExcludedPrice,
    includedTax,
    meetsMinimum,
    refundEligible,
    estimatedRefund,
    finalPriceAfterRefund,
    remainingTaxExcluded,
    estimatedRemainingTaxIncluded,
  };
}