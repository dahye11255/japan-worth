import { useEffect, useState } from "react";

interface PriceComparisonProps {
  koreaPrice: number;
}

interface ExchangeRateResponse {
  rates: {
    KRW: number;
  };
}

function PriceComparison({ koreaPrice }: PriceComparisonProps) {
  const [japanPrice, setJapanPrice] = useState("");

  // 환율 상태
  const [yenToKrw, setYenToKrw] = useState(9.2);
  const [exchangeLoading, setExchangeLoading] = useState(true);
  const [exchangeError, setExchangeError] = useState(false);

  // JPY → KRW 환율 자동 조회
  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        setExchangeLoading(true);
        setExchangeError(false);

        const response = await fetch(
          "https://api.frankfurter.app/latest?from=JPY&to=KRW"
        );

        if (!response.ok) {
          throw new Error("환율 조회에 실패했습니다.");
        }

        const data: ExchangeRateResponse = await response.json();

        if (!data.rates?.KRW) {
          throw new Error("환율 데이터가 없습니다.");
        }

        setYenToKrw(data.rates.KRW);
      } catch (error) {
        console.error("환율 API 오류:", error);

        // API가 실패하면 임시 환율 사용
        setYenToKrw(9.2);
        setExchangeError(true);
      } finally {
        setExchangeLoading(false);
      }
    };

    fetchExchangeRate();
  }, []);

  const japanPriceNumber = Number(japanPrice);

  const japanPriceKrw =
    japanPriceNumber > 0
      ? Math.round(japanPriceNumber * yenToKrw)
      : 0;

  const saving =
    japanPriceKrw > 0
      ? koreaPrice - japanPriceKrw
      : 0;

  const savingRate =
    japanPriceKrw > 0 && koreaPrice > 0
      ? (saving / koreaPrice) * 100
      : 0;

  return (
    <div>
      <h3>가격 비교</h3>

      <label htmlFor="japan-price">
        일본 현지 가격 (엔)
      </label>

      <div>
        ¥{" "}
        <input
          id="japan-price"
          type="number"
          min="0"
          value={japanPrice}
          onChange={(e) => setJapanPrice(e.target.value)}
          placeholder="예: 1045"
        />
      </div>

      {exchangeLoading ? (
        <p>환율 불러오는 중...</p>
      ) : (
        <p>
          적용 환율: ¥1 = ₩{yenToKrw.toFixed(2)}
        </p>
      )}

      {exchangeError && (
        <p>
          ⚠️ 실시간 환율 조회에 실패해 임시 환율을 적용했습니다.
        </p>
      )}

      {japanPriceNumber > 0 && !exchangeLoading && (
        <div>
          <hr />

          <p>
            일본 예상 가격:{" "}
            <strong>
              ₩{japanPriceKrw.toLocaleString()}
            </strong>
          </p>

          <p>
            한국 가격:{" "}
            <strong>
              ₩{koreaPrice.toLocaleString()}
            </strong>
          </p>

          {saving > 0 ? (
            <div>
              <h3>✅ 일본 구매 추천</h3>

              <p>
                약 ₩{saving.toLocaleString()} 절약
              </p>

              <p>
                한국보다 약 {savingRate.toFixed(1)}% 저렴합니다.
              </p>
            </div>
          ) : saving < 0 ? (
            <div>
              <h3>🇰🇷 한국 구매 추천</h3>

              <p>
                한국에서 구매하는 것이 약 ₩
                {Math.abs(saving).toLocaleString()} 저렴합니다.
              </p>

              <p>
                일본에서 굳이 구매할 가격 메리트가 크지 않습니다.
              </p>
            </div>
          ) : (
            <div>
              <h3>🤔 가격이 거의 같습니다</h3>

              <p>
                수하물 공간 등을 고려하면 한국 구매도 괜찮습니다.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PriceComparison;