import { useState } from "react";

import {
  discountPolicies,
  calculateRefundEstimate,
  type TaxRate,
} from "../utils/discountCalculator";

interface DiscountCalculatorProps {
  // 장바구니 일본 가격 총합
  // 소비세 포함 금액 기준
  basePrice: number;
}

export default function DiscountCalculator({
  basePrice,
}: DiscountCalculatorProps) {
  const [couponRate, setCouponRate] =
    useState<number>(0);

  const [taxRate, setTaxRate] =
    useState<TaxRate>(0.1);

  const [
    isTaxFreeShop,
    setIsTaxFreeShop,
  ] = useState(false);

  const [
    isSameStoreSameDay,
    setIsSameStoreSameDay,
  ] = useState(false);

  const result =
    calculateRefundEstimate(
      basePrice,
      couponRate,
      taxRate,
      isTaxFreeShop,
      isSameStoreSameDay
    );

  return (
    <div
      style={{
        border:
          "1px solid #ddd",
        padding: "16px",
        borderRadius: "12px",
        margin: "16px 0",
        backgroundColor:
          "#f9f9f9",
      }}
    >
      <h3
        style={{
          marginTop: 0,
          marginBottom:
            "8px",
        }}
      >
        🇯🇵 2026년 11월
        면세 환급 예상
      </h3>

      <p
        style={{
          marginTop: 0,
          fontSize: "13px",
          color: "#667085",
          lineHeight: 1.5,
        }}
      >
        매장에서 세금 포함
        가격을 먼저 결제한 뒤,
        출국 시 세관 확인 후
        소비세 상당액을
        환급받는 방식입니다.
      </p>

      <div
        style={{
          marginTop: "16px",
          marginBottom:
            "16px",
        }}
      >
        <span>
          현재 장바구니 금액
        </span>

        <div
          style={{
            fontSize: "24px",
            fontWeight: 800,
            marginTop: "4px",
          }}
        >
          ¥
          {basePrice.toLocaleString()}
        </div>

        <small
          style={{
            color: "#667085",
          }}
        >
          소비세 포함 가격 기준
        </small>
      </div>

      {/* 쿠폰 */}

      <div
        style={{
          marginBottom:
            "14px",
        }}
      >
        <label
          htmlFor="coupon-rate"
          style={{
            display: "block",
            marginBottom:
              "6px",
            fontWeight: 600,
          }}
        >
          쿠폰
        </label>

        <select
          id="coupon-rate"
          value={couponRate}
          onChange={(e) =>
            setCouponRate(
              Number(
                e.target.value
              )
            )
          }
          style={{
            width: "100%",
            padding: "10px",
            borderRadius:
              "8px",
            border:
              "1px solid #ccc",
          }}
        >
          {discountPolicies.coupons.map(
            (coupon) => (
              <option
                key={
                  coupon.label
                }
                value={
                  coupon.rate
                }
              >
                {coupon.label}
              </option>
            )
          )}
        </select>
      </div>

      {/* 세율 */}

      <div
        style={{
          marginBottom:
            "16px",
        }}
      >
        <label
          htmlFor="tax-rate"
          style={{
            display: "block",
            marginBottom:
              "6px",
            fontWeight: 600,
          }}
        >
          상품 소비세율
        </label>

        <select
          id="tax-rate"
          value={taxRate}
          onChange={(e) =>
            setTaxRate(
              Number(
                e.target.value
              ) as TaxRate
            )
          }
          style={{
            width: "100%",
            padding: "10px",
            borderRadius:
              "8px",
            border:
              "1px solid #ccc",
          }}
        >
          {discountPolicies.taxRates.map(
            (tax) => (
              <option
                key={tax.rate}
                value={tax.rate}
              >
                {tax.label}
              </option>
            )
          )}
        </select>

        <small
          style={{
            display: "block",
            marginTop: "6px",
            color: "#667085",
          }}
        >
          ※ 술은 10%,
          일반 식품·무알코올
          음료는 보통 8%
        </small>
      </div>

      {/* 면세점 여부 */}

      <label
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems:
            "flex-start",
          gap: "8px",
          marginBottom:
            "12px",
        }}
      >
        <input
          type="checkbox"
          checked={
            isTaxFreeShop
          }
          onChange={(e) =>
            setIsTaxFreeShop(
              e.target.checked
            )
          }
          style={{
            width: "18px",
            height: "18px",
          }}
        />

        <span>
          이 매장은
          <strong>
            {" "}Tax-Free 면세점
          </strong>
          이에요
        </span>
      </label>

      {/* 같은 매장 / 같은 날 */}

      <label
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems:
            "flex-start",
          gap: "8px",
          marginBottom:
            "16px",
        }}
      >
        <input
          type="checkbox"
          checked={
            isSameStoreSameDay
          }
          onChange={(e) =>
            setIsSameStoreSameDay(
              e.target.checked
            )
          }
          style={{
            width: "18px",
            height: "18px",
          }}
        />

        <span>
          장바구니 상품을
          <strong>
            {" "}같은 매장에서
            같은 날
          </strong>
          구매해요
        </span>
      </label>

      <hr
        style={{
          border: 0,
          borderTop:
            "1px solid #ddd",
          margin:
            "18px 0",
        }}
      />

      {/* 계산 상세 */}

      <div
        style={{
          display: "grid",
          gap: "10px",
        }}
      >
        {couponRate > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
            }}
          >
            <span>
              쿠폰 적용 후
            </span>

            <strong>
              ¥
              {result.priceAfterCoupon.toLocaleString()}
            </strong>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
          }}
        >
          <span>
            세전 예상 금액
          </span>

          <strong>
            ¥
            {result.taxExcludedPrice.toLocaleString()}
          </strong>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
          }}
        >
          <span>
            포함 소비세
          </span>

          <strong>
            ¥
            {result.includedTax.toLocaleString()}
          </strong>
        </div>
      </div>

      {/* 5,000엔 조건 */}

      {!result.meetsMinimum ? (
        <div
          style={{
            marginTop:
              "18px",
            padding:
              "14px",
            borderRadius:
              "10px",
            background:
              "#fff7ed",
          }}
        >
          <strong>
            ⚠️ 면세 최소금액
            미달
          </strong>

          <p
            style={{
              marginBottom:
                "6px",
            }}
          >
            세전 구매액이
            ¥5,000 이상이어야
            합니다.
          </p>

          <p
            style={{
              margin:
                "6px 0",
            }}
          >
            세전 기준 약{" "}
            <strong>
              ¥
              {result.remainingTaxExcluded.toLocaleString()}
            </strong>{" "}
            부족합니다.
          </p>

          <p
            style={{
              marginBottom: 0,
            }}
          >
            현재 세율 기준 약{" "}
            <strong>
              ¥
              {result.estimatedRemainingTaxIncluded.toLocaleString()}
            </strong>{" "}
            더 구매하면
            기준에 도달합니다.
          </p>
        </div>
      ) : (
        <div
          style={{
            marginTop:
              "18px",
            padding:
              "14px",
            borderRadius:
              "10px",
            background:
              "#ecfdf3",
          }}
        >
          <strong>
            ✅ 세전 ¥5,000
            이상
          </strong>

          <p
            style={{
              marginBottom: 0,
            }}
          >
            면세 최소 구매금액
            조건을 충족합니다.
          </p>
        </div>
      )}

      {/* 조건 안내 */}

      {result.meetsMinimum &&
        !isTaxFreeShop && (
          <p
            style={{
              marginTop:
                "14px",
            }}
          >
            ⚠️ 환급을
            계산하려면 해당
            매장이 Tax-Free
            면세점인지 확인해
            주세요.
          </p>
        )}

      {result.meetsMinimum &&
        isTaxFreeShop &&
        !isSameStoreSameDay && (
          <p
            style={{
              marginTop:
                "14px",
            }}
          >
            ⚠️ ¥5,000 기준은
            같은 매장에서 같은
            날 구매한 금액을
            기준으로 판단합니다.
          </p>
        )}

      {/* 환급 가능 */}

      {result.refundEligible && (
        <div
          style={{
            marginTop:
              "18px",
            padding:
              "16px",
            borderRadius:
              "12px",
            background:
              "#eef4ff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              marginBottom:
                "12px",
            }}
          >
            <span>
              💴 예상 소비세
              환급
            </span>

            <strong
              style={{
                fontSize:
                  "20px",
              }}
            >
              ¥
              {result.estimatedRefund.toLocaleString()}
            </strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
            }}
          >
            <span>
              환급 후 예상
              실구매가
            </span>

            <strong
              style={{
                fontSize:
                  "22px",
              }}
            >
              ¥
              {result.finalPriceAfterRefund.toLocaleString()}
            </strong>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop:
            "16px",
          fontSize: "12px",
          lineHeight: 1.6,
          color: "#667085",
        }}
      >
        ※ 2026년 11월 1일
        이후 구매분의 새로운
        면세 환급방식을 기준으로
        한 예상값입니다.
        <br />
        ※ 구매 후 90일 이내
        출국 시 세관의 반출 확인이
        필요합니다.
        <br />
        ※ 실제 결제·쿠폰 및
        세금 반올림 방식은 매장에
        따라 차이가 있을 수
        있습니다.
      </div>
    </div>
  );
}