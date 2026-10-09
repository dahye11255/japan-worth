import { useEffect, useState } from "react";

interface PriceComparisonProps {
  koreaPrice: number;
  productName: string;
  jan: string;
}

interface ExchangeRateResponse {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

interface CartItem {
  jan: string;
  productName: string;
  japanPrice: number;
  japanPriceKrw: number;
  koreaPrice: number;
  saving: number;
  quantity: number;
}

const FALLBACK_YEN_TO_KRW = 8.4;

function PriceComparison({
  koreaPrice,
  productName,
  jan,
}: PriceComparisonProps) {
  const [japanPrice, setJapanPrice] = useState("");

  const [yenToKrw, setYenToKrw] = useState(FALLBACK_YEN_TO_KRW);
  const [exchangeLoading, setExchangeLoading] = useState(true);
  const [exchangeError, setExchangeError] = useState(false);
  const [exchangeDate, setExchangeDate] = useState("");

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        setExchangeLoading(true);
        setExchangeError(false);

        const response = await fetch(
          "https://api.frankfurter.dev/v2/rate/jpy/krw"
        );

        if (!response.ok) {
          throw new Error(
            `환율 조회 실패: ${response.status}`
          );
        }

        const data: ExchangeRateResponse =
          await response.json();

        if (
          typeof data.rate !== "number" ||
          !Number.isFinite(data.rate)
        ) {
          throw new Error(
            "환율 데이터가 올바르지 않습니다."
          );
        }

        setYenToKrw(data.rate);
        setExchangeDate(data.date);
      } catch (error) {
        console.error("환율 API 오류:", error);

        setYenToKrw(FALLBACK_YEN_TO_KRW);
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

  const addToCart = () => {
    if (japanPriceNumber <= 0) {
      alert("일본 가격을 입력해주세요.");
      return;
    }

    const savedCart =
      localStorage.getItem("japanWorthCart");

    const cart: CartItem[] = savedCart
      ? JSON.parse(savedCart)
      : [];

    const existingItem = cart.find(
      (item) => item.jan === jan
    );

    if (existingItem) {
      existingItem.quantity += 1;

      existingItem.japanPrice =
        japanPriceNumber;

      existingItem.japanPriceKrw =
        japanPriceKrw;

      existingItem.saving =
        saving;
    } else {
      const newItem: CartItem = {
        jan,
        productName,
        japanPrice: japanPriceNumber,
        japanPriceKrw,
        koreaPrice,
        saving,
        quantity: 1,
      };

      cart.push(newItem);
    }

    localStorage.setItem(
      "japanWorthCart",
      JSON.stringify(cart)
    );

    alert("장바구니에 담았습니다.");
  };

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
          onChange={(e) =>
            setJapanPrice(e.target.value)
          }
          placeholder="예: 1045"
        />
      </div>

      {exchangeLoading ? (
        <p>최신 환율 불러오는 중...</p>
      ) : (
        <>
          <p>
            최신 환율: ¥1 = ₩
            {yenToKrw.toFixed(2)}
          </p>

          {exchangeDate &&
            !exchangeError && (
              <small>
                환율 기준일: {exchangeDate}
              </small>
            )}
        </>
      )}

      {exchangeError && (
        <p>
          ⚠️ 최신 환율 조회에 실패해 임시
          환율 (¥1 = ₩
          {FALLBACK_YEN_TO_KRW})을
          적용했습니다.
        </p>
      )}

      {japanPriceNumber > 0 &&
        !exchangeLoading && (
          <div>
            <hr />

            <p>
              일본 예상 가격:{" "}
              <strong>
                ₩
                {japanPriceKrw.toLocaleString()}
              </strong>
            </p>

            <p>
              한국 가격:{" "}
              <strong>
                ₩
                {koreaPrice.toLocaleString()}
              </strong>
            </p>

            {saving > 0 ? (
              <div>
                <h3>
                  ✅ 일본 구매 추천
                </h3>

                <p>
                  약 ₩
                  {saving.toLocaleString()}{" "}
                  절약
                </p>

                <p>
                  한국보다 약{" "}
                  {savingRate.toFixed(1)}%
                  저렴합니다.
                </p>
              </div>
            ) : saving < 0 ? (
              <div>
                <h3>
                  🇰🇷 한국 구매 추천
                </h3>

                <p>
                  한국에서 구매하는 것이
                  약 ₩
                  {Math.abs(
                    saving
                  ).toLocaleString()}{" "}
                  저렴합니다.
                </p>

                <p>
                  일본에서 구매할 가격
                  메리트가 크지 않습니다.
                </p>
              </div>
            ) : (
              <div>
                <h3>
                  🤔 가격이 거의 같습니다
                </h3>

                <p>
                  수하물 공간 등을
                  고려하면 한국 구매도
                  괜찮습니다.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={addToCart}
            >
              🛒 장바구니에 담기
            </button>
          </div>
        )}
    </div>
  );
}

export default PriceComparison;