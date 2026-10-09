import { useState } from "react";

interface PriceComparisonProps {
  koreaPrice: number;
}

function PriceComparison({ koreaPrice }: PriceComparisonProps) {
  const [japanPrice, setJapanPrice] = useState("");

  // 임시 환율
  const yenToKrw = 9.2;

  const japanPriceNumber = Number(japanPrice);

  const japanPriceKrw =
    japanPriceNumber > 0 ? Math.round(japanPriceNumber * yenToKrw) : 0;

  const saving = japanPriceKrw > 0 ? koreaPrice - japanPriceKrw : 0;

  const savingRate = japanPriceKrw > 0 ? (saving / koreaPrice) * 100 : 0;

  return (
    <div>
      <h3>가격 비교</h3>

      <label>일본 현지 가격 (엔)</label>

      <div>
        ¥{" "}
        <input
          type="number"
          value={japanPrice}
          onChange={(e) => setJapanPrice(e.target.value)}
          placeholder="예: 598"
        />
      </div>

      <p>적용 환율: ¥1 = ₩{yenToKrw}</p>

      {japanPriceNumber > 0 && (
        <div>
          <p>일본 예상 가격: ₩{japanPriceKrw.toLocaleString()}</p>

          <p>한국 가격: ₩{koreaPrice.toLocaleString()}</p>

          {saving > 0 ? (
            <div>
              <h3>✅ 일본 구매 추천</h3>

              <p>약 ₩{saving.toLocaleString()} 절약</p>

              <p>한국보다 약 {savingRate.toFixed(1)}% 저렴합니다.</p>
            </div>
          ) : (
            <div>
              <h3>🇰🇷 한국 구매 추천</h3>

              <p>
                한국에서 구매하는 것이 약 ₩{Math.abs(saving).toLocaleString()}{" "}
                저렴합니다.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PriceComparison;
