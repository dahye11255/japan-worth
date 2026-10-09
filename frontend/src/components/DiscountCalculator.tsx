import React, { useState } from 'react';
import { discountPolicies, calculateFinalPrice } from '../utils/discountCalculator';

export default function DiscountCalculator() {
  const [basePrice, setBasePrice] = useState<number>(10000); // 기본 테스트 금액 10,000엔
  const [couponRate, setCouponRate] = useState<number>(0);
  const [isTaxFree, setIsTaxFree] = useState<boolean>(false);

  // 네가 만든 함수로 최종 가격 계산!
  const finalPrice = calculateFinalPrice(basePrice, couponRate, isTaxFree);

  return (
    <div style={{ border: '1px solid #ddd', padding: '16px', borderRadius: '8px', margin: '16px 0', backgroundColor: '#f9f9f9' }}>
      <h3 style={{ marginTop: 0, marginBottom: '16px' }}>💴 면세 및 쿠폰 계산기</h3>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'inline-block', width: '120px' }}>상품 금액 (엔): </label>
        <input
          type="number"
          value={basePrice}
          onChange={(e) => setBasePrice(Number(e.target.value))}
          style={{ padding: '6px', width: '120px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
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
          면세 적용 (Tax-Free)
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
