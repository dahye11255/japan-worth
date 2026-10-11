import { useEffect, useState } from "react";

interface PriceComparisonProps {
  productName: string;
  searchKeyword?: string;
  jan: string;
}

interface ExchangeRateResponse {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

interface ShoppingResult {
  title: string;
  source: string;
  price: string;
  extractedPrice: number;
  link: string;
  thumbnail: string;
}

interface ShoppingApiResponse {
  results?: ShoppingResult[];
  error?: string;
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
  searchKeyword,
  jan,
}: PriceComparisonProps) {
  const [japanPrice, setJapanPrice] = useState("");

  const [yenToKrw, setYenToKrw] =
    useState(FALLBACK_YEN_TO_KRW);

  const [exchangeLoading, setExchangeLoading] =
    useState(true);

  const [exchangeError, setExchangeError] =
    useState(false);

  const [exchangeDate, setExchangeDate] =
    useState("");

  const [shoppingResults, setShoppingResults] =
    useState<ShoppingResult[]>([]);

  const [shoppingLoading, setShoppingLoading] =
    useState(true);

  const [shoppingError, setShoppingError] =
    useState("");

  const [selectedResult, setSelectedResult] =
    useState<ShoppingResult | null>(null);

  const [manualKoreaPrice, setManualKoreaPrice] =
    useState("");

  /*
   * 실제 Google Shopping 검색에 사용할 검색어
   * searchKeyword가 있으면 우선 사용
   */
  const shoppingQuery =
    searchKeyword?.trim() || productName;

  /*
   * 환율 조회
   */
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

  /*
   * Google Shopping 자동 검색
   */
  useEffect(() => {
    const fetchShoppingResults = async () => {
      try {
        setShoppingLoading(true);
        setShoppingError("");
        setShoppingResults([]);
        setSelectedResult(null);
        setManualKoreaPrice("");

        const response = await fetch(
          `/api/shopping?query=${encodeURIComponent(
            shoppingQuery
          )}`
        );

        const data: ShoppingApiResponse =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ??
              `쇼핑 검색 실패: ${response.status}`
          );
        }

        const results = data.results ?? [];

        if (results.length === 0) {
          throw new Error(
            "한국 판매 상품을 찾지 못했습니다."
          );
        }

        setShoppingResults(results);

        // 검색 결과 첫 번째 상품을 기본 선택
        setSelectedResult(results[0]);
      } catch (error) {
        console.error(
          "한국 쇼핑 검색 오류:",
          error
        );

        setShoppingError(
          error instanceof Error
            ? error.message
            : "한국 판매가 검색에 실패했습니다."
        );
      } finally {
        setShoppingLoading(false);
      }
    };

    if (shoppingQuery) {
      fetchShoppingResults();
    }
  }, [shoppingQuery]);

  const japanPriceNumber =
    Number(japanPrice);

  const japanPriceKrw =
    japanPriceNumber > 0
      ? Math.round(
          japanPriceNumber * yenToKrw
        )
      : 0;

  /*
   * 자동 검색 결과가 있으면 선택된 상품 가격 사용
   * 자동 검색 실패 시 직접 입력 가격 사용
   */
  const koreaPriceNumber =
    selectedResult
      ? Math.round(
          selectedResult.extractedPrice
        )
      : Number(manualKoreaPrice);

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

  /*
   * fallback 검색 사이트
   * 여기서도 동일한 searchKeyword 사용
   */
  const encodedSearchKeyword =
    encodeURIComponent(shoppingQuery);

  const naverShoppingUrl =
    `https://search.shopping.naver.com/search/all?query=${encodedSearchKeyword}`;

  const coupangUrl =
    `https://www.coupang.com/np/search?q=${encodedSearchKeyword}`;

  const openShoppingSite = (
    url: string
  ) => {
    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  /*
   * 장바구니
   */
  const addToCart = () => {
    if (japanPriceNumber <= 0) {
      alert(
        "일본 가격을 입력해주세요."
      );
      return;
    }

    if (koreaPriceNumber <= 0) {
      alert(
        "한국 판매가를 확인해주세요."
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
          ⚠️ 최신 환율 조회에 실패해
          임시 환율 (¥1 = ₩
          {FALLBACK_YEN_TO_KRW})을
          적용했습니다.
        </p>
      )}

      {japanPriceNumber > 0 &&
        !exchangeLoading && (
          <p>
            🇯🇵 일본 예상 가격:{" "}
            <strong>
              ₩
              {japanPriceKrw.toLocaleString()}
            </strong>
          </p>
        )}

      <hr />

      {/* 한국 쇼핑 자동 검색 */}

      <h3>
        🇰🇷 한국 온라인 판매가
      </h3>

      <small>
        검색어: {shoppingQuery}
      </small>

      {shoppingLoading && (
        <p>
          한국 판매 상품을 자동으로
          찾는 중...
        </p>
      )}

      {!shoppingLoading &&
        shoppingResults.length > 0 && (
          <>
            <p>
              동일한 상품을 선택해주세요.
            </p>

            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {shoppingResults.map(
                (result, index) => {
                  const isSelected =
                    selectedResult ===
                    result;

                  return (
                    <div
                      key={`${result.title}-${index}`}
                      style={{
                        padding:
                          "14px",
                        border:
                          isSelected
                            ? "2px solid #111827"
                            : "1px solid #d0d5dd",
                        borderRadius:
                          "14px",
                        background:
                          "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          gap: "12px",
                        }}
                      >
                        {result.thumbnail && (
                          <img
                            src={
                              result.thumbnail
                            }
                            alt={
                              result.title
                            }
                            style={{
                              width:
                                "70px",
                              height:
                                "70px",
                              objectFit:
                                "contain",
                              borderRadius:
                                "8px",
                            }}
                          />
                        )}

                        <div
                          style={{
                            flex: 1,
                          }}
                        >
                          <strong>
                            {
                              result.title
                            }
                          </strong>

                          <p>
                            판매처:{" "}
                            {
                              result.source
                            }
                          </p>

                          <p>
                            <strong>
                              ₩
                              {Math.round(
                                result.extractedPrice
                              ).toLocaleString()}
                            </strong>
                          </p>
                        </div>
                      </div>

                      <div
                        style={{
                          display:
                            "grid",
                          gap: "8px",
                          marginTop:
                            "10px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedResult(
                              result
                            )
                          }
                        >
                          {isSelected
                            ? "✅ 선택된 상품"
                            : "이 상품 가격으로 비교"}
                        </button>

                        {result.link && (
                          <button
                            type="button"
                            onClick={() =>
                              openShoppingSite(
                                result.link
                              )
                            }
                          >
                            🔗 판매 페이지 보기
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </>
        )}

      {/* 자동 검색 실패 fallback */}

      {!shoppingLoading &&
        shoppingError && (
          <div>
            <p>
              ⚠️ {shoppingError}
            </p>

            <p>
              직접 한국 판매가를
              확인해주세요.
            </p>

            <div
              style={{
                display: "grid",
                gap: "10px",
                marginBottom:
                  "18px",
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
                🟢 네이버쇼핑에서 확인
              </button>

              <button
                type="button"
                onClick={() =>
                  openShoppingSite(
                    coupangUrl
                  )
                }
              >
                🛒 쿠팡에서 확인
              </button>
            </div>

            <label htmlFor="manual-korea-price">
              한국에서 확인한 가격
              (원)
            </label>

            <input
              id="manual-korea-price"
              type="number"
              min="0"
              value={
                manualKoreaPrice
              }
              onChange={(e) =>
                setManualKoreaPrice(
                  e.target.value
                )
              }
              placeholder="예: 12000"
            />
          </div>
        )}

      {/* 선택된 한국 가격 */}

      {koreaPriceNumber > 0 && (
        <>
          <hr />

          <p>
            🇰🇷 비교할 한국 가격:{" "}
            <strong>
              ₩
              {koreaPriceNumber.toLocaleString()}
            </strong>
          </p>

          {selectedResult && (
            <small>
              {selectedResult.source} /{" "}
              {selectedResult.title}
            </small>
          )}
        </>
      )}

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
              🇰🇷 한국 구매 예상:{" "}
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