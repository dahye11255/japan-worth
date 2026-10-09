export const discountPolicies = {
  taxRate: 0.10,
  coupons: [
    { label: "없음", rate: 0 },
    { label: "5% 할인", rate: 0.05 },
    { label: "7% 할인", rate: 0.07 }
  ]
};

export function calculateFinalPrice(
  basePrice: number,
  couponRate: number,
  isTaxFree: boolean
): number {
  if (!basePrice || basePrice <= 0) return 0;

  const priceAfterCoupon = basePrice * (1 - couponRate);

  const finalPrice = isTaxFree 
    ? priceAfterCoupon 
    : priceAfterCoupon * (1 + discountPolicies.taxRate);

  return Math.floor(finalPrice);
}
