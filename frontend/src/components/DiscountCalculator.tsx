import React, { useState } from 'react';
import { discountPolicies, calculateFinalPrice } from '../utils/discountCalculator';

// 💡 팀원이 장바구니에서 넘겨줘야 할 데이터(Props) 정의
interface DiscountCalculatorProps {
  basePrice: number; // 장바구니 총 금액
}

export default function DiscountCalculator({ basePrice }: DiscountCalculatorProps) {
  // 금액 입력창(input)을 없애고, props로 받은 basePrice를 바로 사용해!
  const [couponRate, setCouponRate] = useState<number>(0);
  const [isTaxFree, setIsTaxFree] = useState<boolean>(false);

  const finalPrice = calculateFinalPrice(basePrice, couponRate, isTaxFree);

  return (
    <div style={{ border: '1px solid #ddd', padding: '16px', borderRadius: '8px', margin: '16px 0', backgroundColor: '#f9f9f9' }}>
      <h3 style={{ marginTop: 0, marginBottom: '16px' }}>💴 장바구니 면세/쿠폰 계산</h3>

      <div style={{ marginBottom: '12px', fontSize: '16px' }}>
        <span>현재 장바구니 금액: </span>
        <strong>{basePrice.toLocaleString()} 엔</strong>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'inline-block', width: '120px' }}>쿠폰 선택: </label>
        <select
          value={couponRate}
          onChange={(e) => setCouponRate(Number(e.target.value))}
          style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          {discountPolicies.coupons.map((coupon, idx) => (
            <option key={idx} value={coupon.rate}>
              {coupon.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={isTaxFree}
            onChange={(e) => setIsTaxFree(e.target.checked)}
            style={{ width: '16px', height: '16px' }}
          />
          면세 적용 (Tax-Free 10% 제외)
        </label>
      </div>

      <hr style={{ borderTop: '1px solid #ddd', margin: '16px 0' }} />

      <div style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
        <span>최종 예상 결제액:</span>
        <span style={{ color: '#e53e3e' }}>{finalPrice.toLocaleString()} 엔</span>
      </div>
    </div>
  );
}
