import { useEffect, useState } from "react";

interface PriceComparisonProps {
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
  productName,
  jan,
}: PriceComparisonProps) {
  const [japanPrice, setJapanPrice] = useState("");
  const [koreaPrice, setKoreaPrice] = useState("");

  const [yenToKrw, setYenToKrw] =
    useState(FALLBACK_YEN_TO_KRW);

  const [exchangeLoading, setExchangeLoading] =
    useState(true);

  const [exchangeError, setExchangeError] =
    useState(false);

  const [exchangeDate, setExchangeDate] =
    useState("");

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
        console.error(
          "환율 API 오류:",
          error
        );

        setYenToKrw(
          FALLBACK_YEN_TO_KRW
        );

        setExchangeError(true);
      } finally {
        setExchangeLoading(false);
      }
    };

    fetchExchangeRate();
  }, []);

  const japanPriceNumber =
    Number(japanPrice);

  const koreaPriceNumber =
    Number(koreaPrice);

  const japanPriceKrw =
    japanPriceNumber > 0
      ? Math.round(
          japanPriceNumber * yenToKrw
        )
      : 0;

  const saving =
    japanPriceKrw > 0 &&
    koreaPriceNumber > 0
      ? koreaPriceNumber -
        japanPriceKrw
      : 0;

  const savingRate =
    japanPriceKrw > 0 &&
    koreaPriceNumber > 0
      ? (saving /
          koreaPriceNumber) *
        100
      : 0;

  const encodedProductName =
    encodeURIComponent(productName);

  const naverShoppingUrl =
    `https://search.shopping.naver.com/search/all?query=${encodedProductName}`;

  const coupangUrl =
    `https://www.coupang.com/np/search?q=${encodedProductName}`;

  const openShoppingSite = (
    url: string
  ) => {
    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const addToCart = () => {
    if (japanPriceNumber <= 0) {
      alert(
        "일본 가격을 입력해주세요."
      );
      return;
    }

    if (koreaPriceNumber <= 0) {
      alert(
        "한국 가격을 입력해주세요."
      );
      return;
    }

    const savedCart =
      localStorage.getItem(
        "japanWorthCart"
      );

    const cart: CartItem[] =
      savedCart
        ? JSON.parse(savedCart)
        : [];

    const existingItem =
      cart.find(
        (item) => item.jan === jan
      );

    if (existingItem) {
      existingItem.quantity += 1;

      existingItem.japanPrice =
        japanPriceNumber;

      existingItem.japanPriceKrw =
        japanPriceKrw;

      existingItem.koreaPrice =
        koreaPriceNumber;

      existingItem.saving =
        saving;
    } else {
      const newItem: CartItem = {
        jan,
        productName,
        japanPrice:
          japanPriceNumber,
        japanPriceKrw,
        koreaPrice:
          koreaPriceNumber,
        saving,
        quantity: 1,
      };

      cart.push(newItem);
    }

    localStorage.setItem(
      "japanWorthCart",
      JSON.stringify(cart)
    );

    alert(
      "장바구니에 담았습니다."
    );
  };

  return (
    <div>
      <h3>가격 비교</h3>

      {/* 일본 가격 */}

      <label htmlFor="japan-price">
        일본 현지 가격 (엔)
      </label>

      <div>
        <input
          id="japan-price"
          type="number"
          min="0"
          value={japanPrice}
          onChange={(e) =>
            setJapanPrice(
              e.target.value
            )
          }
          placeholder="예: 1045"
        />
      </div>

      {exchangeLoading ? (
        <p>
          최신 환율 불러오는 중...
        </p>
      ) : (
        <>
          <p>
            최신 환율: ¥1 = ₩
            {yenToKrw.toFixed(2)}
          </p>

          {exchangeDate &&
            !exchangeError && (
              <small>
                환율 기준일:{" "}
                {exchangeDate}
              </small>
            )}
        </>
      )}

      {exchangeError && (
        <p>
          ⚠️ 최신 환율 조회에
          실패해 임시 환율 (¥1 =
          ₩{FALLBACK_YEN_TO_KRW})
          을 적용했습니다.
        </p>
      )}

      {japanPriceNumber > 0 &&
        !exchangeLoading && (
          <p>
            일본 예상 가격:{" "}
            <strong>
              ₩
              {japanPriceKrw.toLocaleString()}
            </strong>
          </p>
        )}

      <hr />

      {/* 한국 가격 */}

      <h3>
        🇰🇷 한국 판매가 확인
      </h3>

      <p>
        현재 판매 중인 한국 가격을
        확인해보세요.
      </p>

      <div
        style={{
          display: "grid",
          gap: "10px",
          marginBottom: "18px",
        }}
      >
        <button
          type="button"
          onClick={() =>
            openShoppingSite(
              naverShoppingUrl
            )
          }
        >
          🟢 네이버쇼핑에서 보기
        </button>

        <button
          type="button"
          onClick={() =>
            openShoppingSite(
              coupangUrl
            )
          }
        >
          🛒 쿠팡에서 보기
        </button>
      </div>

      <label htmlFor="korea-price">
        한국에서 확인한 가격 (원)
      </label>

      <input
        id="korea-price"
        type="number"
        min="0"
        value={koreaPrice}
        onChange={(e) =>
          setKoreaPrice(
            e.target.value
          )
        }
        placeholder="예: 12000"
      />

      <small>
        네이버쇼핑 또는 쿠팡에서
        확인한 현재 판매가를
        입력해주세요.
      </small>

      {/* 비교 결과 */}

      {japanPriceNumber > 0 &&
        koreaPriceNumber > 0 &&
        !exchangeLoading && (
          <div>
            <hr />

            <h3>비교 결과</h3>

            <p>
              🇯🇵 일본 구매 예상:{" "}
              <strong>
                ₩
                {japanPriceKrw.toLocaleString()}
              </strong>
            </p>

            <p>
              🇰🇷 한국 구매 가격:{" "}
              <strong>
                ₩
                {koreaPriceNumber.toLocaleString()}
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
                  {savingRate.toFixed(
                    1
                  )}
                  % 저렴합니다.
                </p>
              </div>
            ) : saving < 0 ? (
              <div>
                <h3>
                  🇰🇷 한국 구매 추천
                </h3>

                <p>
                  한국에서 구매하면 약
                  ₩
                  {Math.abs(
                    saving
                  ).toLocaleString()}{" "}
                  절약할 수 있습니다.
                </p>
              </div>
            ) : (
              <div>
                <h3>
                  🤔 가격이 같습니다
                </h3>

                <p>
                  편의성과 수하물 공간을
                  고려해 구매처를
                  선택하세요.
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