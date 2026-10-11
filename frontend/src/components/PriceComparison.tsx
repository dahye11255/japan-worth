import {
  useEffect,
  useState,
} from "react";

interface PriceComparisonProps {
  productName: string;
  searchKeyword?: string;
  jan: string;

  // 등록 상품이면 products.ts에서 전달
  taxRate?: 0.1 | 0.08;
  taxFreeEligible?: boolean;
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

  // 구매 정보
  purchaseDate: string;
  storeName: string;

  // 세금 / 면세 정보
  taxRate: 0.1 | 0.08;

  // 상품 자체가 면세 대상인지
  taxFreeEligible: boolean;

  // 이 매장에서 실제 면세 처리 가능한지
  taxFreeAvailableAtStore: boolean;
}

const FALLBACK_YEN_TO_KRW = 8.4;

/*
 * 일본 현지 날짜
 */
function getTodayInJapan() {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(
      new Date()
    );

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value ?? "";

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value ?? "";

  const day =
    parts.find(
      (part) =>
        part.type === "day"
    )?.value ?? "";

  return `${year}-${month}-${day}`;
}

function PriceComparison({
  productName,
  searchKeyword,
  jan,
  taxRate,
  taxFreeEligible,
}: PriceComparisonProps) {
  const [
    japanPrice,
    setJapanPrice,
  ] = useState("");

  const [
    yenToKrw,
    setYenToKrw,
  ] = useState(
    FALLBACK_YEN_TO_KRW
  );

  const [
    exchangeLoading,
    setExchangeLoading,
  ] = useState(true);

  const [
    exchangeError,
    setExchangeError,
  ] = useState(false);

  const [
    exchangeDate,
    setExchangeDate,
  ] = useState("");

  const [
    shoppingResults,
    setShoppingResults,
  ] =
    useState<
      ShoppingResult[]
    >([]);

  const [
    shoppingLoading,
    setShoppingLoading,
  ] = useState(true);

  const [
    shoppingError,
    setShoppingError,
  ] = useState("");

  const [
    selectedResult,
    setSelectedResult,
  ] =
    useState<
      ShoppingResult | null
    >(null);

  const [
    useManualFallback,
    setUseManualFallback,
  ] = useState(false);

  const [
    manualKoreaPrice,
    setManualKoreaPrice,
  ] = useState("");

  /*
   * 구매 정보
   */
  const [
    purchaseDate,
    setPurchaseDate,
  ] = useState(
    getTodayInJapan()
  );

  const [
    storeName,
    setStoreName,
  ] = useState("");

  /*
   * 실제 해당 매장에서
   * Tax-Free 적용 가능한지
   */
  const [
    taxFreeAvailableAtStore,
    setTaxFreeAvailableAtStore,
  ] = useState(false);

  /*
   * 미등록 상품용
   */
  const [
    manualTaxRate,
    setManualTaxRate,
  ] =
    useState<0.1 | 0.08>(
      0.1
    );

  const [
    manualTaxFreeEligible,
    setManualTaxFreeEligible,
  ] = useState(false);

  /*
   * 등록 상품이면 DB 값 사용
   * 미등록 상품이면 사용자 선택값 사용
   */
  const effectiveTaxRate =
    taxRate ??
    manualTaxRate;

  const effectiveTaxFreeEligible =
    taxFreeEligible ??
    manualTaxFreeEligible;

  /*
   * 상품 검색어
   */
  const shoppingQuery =
    searchKeyword?.trim() ||
    productName;

  /*
   * 환율
   */
  useEffect(() => {
    const fetchExchangeRate =
      async () => {
        try {
          setExchangeLoading(
            true
          );

          setExchangeError(
            false
          );

          const response =
            await fetch(
              "https://api.frankfurter.dev/v2/rate/jpy/krw"
            );

          if (
            !response.ok
          ) {
            throw new Error(
              "환율 조회 실패"
            );
          }

          const data: ExchangeRateResponse =
            await response.json();

          if (
            typeof data.rate !==
              "number" ||
            !Number.isFinite(
              data.rate
            )
          ) {
            throw new Error(
              "환율 데이터 오류"
            );
          }

          setYenToKrw(
            data.rate
          );

          setExchangeDate(
            data.date
          );
        } catch (error) {
          console.error(
            "환율 API 오류:",
            error
          );

          setYenToKrw(
            FALLBACK_YEN_TO_KRW
          );

          setExchangeError(
            true
          );
        } finally {
          setExchangeLoading(
            false
          );
        }
      };

    fetchExchangeRate();
  }, []);

  /*
   * Google Shopping 검색
   */
  useEffect(() => {
    const fetchShoppingResults =
      async () => {
        try {
          setShoppingLoading(
            true
          );

          setShoppingError(
            ""
          );

          setShoppingResults(
            []
          );

          setSelectedResult(
            null
          );

          setUseManualFallback(
            false
          );

          const response =
            await fetch(
              `/api/shopping?query=${encodeURIComponent(
                shoppingQuery
              )}`
            );

          const data: ShoppingApiResponse =
            await response.json();

          if (
            !response.ok
          ) {
            throw new Error(
              data.error ??
                "한국 상품 검색 실패"
            );
          }

          const results =
            data.results ?? [];

          setShoppingResults(
            results
          );

          if (
            results.length ===
            0
          ) {
            setUseManualFallback(
              true
            );
          }
        } catch (error) {
          console.error(
            "쇼핑 검색 오류:",
            error
          );

          setShoppingError(
            error instanceof
              Error
              ? error.message
              : "검색 실패"
          );

          setUseManualFallback(
            true
          );
        } finally {
          setShoppingLoading(
            false
          );
        }
      };

    if (shoppingQuery) {
      fetchShoppingResults();
    }
  }, [shoppingQuery]);

  /*
   * 가격 계산
   */
  const japanPriceNumber =
    Number(japanPrice);

  const japanPriceKrw =
    japanPriceNumber > 0
      ? Math.round(
          japanPriceNumber *
            yenToKrw
        )
      : 0;

  const koreaPriceNumber =
    selectedResult
      ? Math.round(
          selectedResult.extractedPrice
        )
      : Number(
          manualKoreaPrice
        );

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
   * fallback 사이트
   */
  const encodedKeyword =
    encodeURIComponent(
      shoppingQuery
    );

  const naverShoppingUrl =
    `https://search.shopping.naver.com/search/all?query=${encodedKeyword}`;

  /*
   * 이 부분은 기존 코드 그대로 유지
   */
  const coupangUrl =
    `https://www.google.com/search?q=${encodeURIComponent(
      `${shoppingQuery} site:coupang.com`
    )}`;

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
   * 장바구니 추가
   */
  const addToCart = () => {
    if (
      japanPriceNumber <= 0
    ) {
      alert(
        "일본 가격을 입력해주세요."
      );
      return;
    }

    if (
      koreaPriceNumber <= 0
    ) {
      alert(
        "한국 가격을 확인해주세요."
      );
      return;
    }

    if (!purchaseDate) {
      alert(
        "구매 날짜를 선택해주세요."
      );
      return;
    }

    if (
      !storeName.trim()
    ) {
      alert(
        "매장명을 입력해주세요."
      );
      return;
    }

    const savedCart =
      localStorage.getItem(
        "japanWorthCart"
      );

    const cart: CartItem[] =
      savedCart
        ? JSON.parse(
            savedCart
          )
        : [];

    /*
     * 같은 상품이라도
     * 날짜 / 매장이 다르면
     * 별도 장바구니 항목으로 저장
     */
    const existingItem =
      cart.find(
        (item) =>
          item.jan ===
            jan &&
          item.purchaseDate ===
            purchaseDate &&
          item.storeName ===
            storeName.trim() &&
          item.taxFreeAvailableAtStore ===
            (
              effectiveTaxFreeEligible &&
              taxFreeAvailableAtStore
            )
      );

    if (existingItem) {
      existingItem.quantity +=
        1;

      existingItem.japanPrice =
        japanPriceNumber;

      existingItem.japanPriceKrw =
        japanPriceKrw;

      existingItem.koreaPrice =
        koreaPriceNumber;

      existingItem.saving =
        saving;

      existingItem.taxRate =
        effectiveTaxRate;

      existingItem.taxFreeEligible =
        effectiveTaxFreeEligible;

      existingItem.taxFreeAvailableAtStore =
        effectiveTaxFreeEligible &&
        taxFreeAvailableAtStore;
    } else {
      cart.push({
        jan,

        productName,

        japanPrice:
          japanPriceNumber,

        japanPriceKrw,

        koreaPrice:
          koreaPriceNumber,

        saving,

        quantity: 1,

        purchaseDate,

        storeName:
          storeName.trim(),

        taxRate:
          effectiveTaxRate,

        taxFreeEligible:
          effectiveTaxFreeEligible,

        taxFreeAvailableAtStore:
          effectiveTaxFreeEligible &&
          taxFreeAvailableAtStore,
      });
    }

    localStorage.setItem(
      "japanWorthCart",
      JSON.stringify(
        cart
      )
    );

    alert(
      `장바구니에 담았습니다.\n${purchaseDate} / ${storeName.trim()}`
    );
  };

  return (
    <div>
      <h3>
        가격 비교
      </h3>

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
          최신 환율 불러오는
          중...
        </p>
      ) : (
        <>
          <p>
            최신 환율: ¥1 =
            ₩
            {yenToKrw.toFixed(
              2
            )}
          </p>

          {exchangeDate &&
            !exchangeError && (
              <small>
                환율 기준일:{" "}
                {
                  exchangeDate
                }
              </small>
            )}
        </>
      )}

      {exchangeError && (
        <p>
          ⚠️ 환율 조회에
          실패하여 임시 환율을
          적용했습니다.
        </p>
      )}

      {japanPriceNumber >
        0 &&
        !exchangeLoading && (
          <p>
            🇯🇵 일본 예상
            가격:{" "}
            <strong>
              ₩
              {japanPriceKrw.toLocaleString()}
            </strong>
          </p>
        )}

      <hr />

      {/* Google Shopping */}

      <h3>
        🇰🇷 한국 판매가 찾기
      </h3>

      <p>
        Google Shopping에서
        동일한 상품을
        확인해주세요.
      </p>

      <small>
        검색어:{" "}
        {shoppingQuery}
      </small>

      {shoppingLoading && (
        <p>
          한국 판매 상품을
          검색하는 중...
        </p>
      )}

      {!shoppingLoading &&
        !useManualFallback &&
        shoppingResults.length >
          0 && (
          <>
            <div
              style={{
                display:
                  "grid",
                gap: "12px",
                marginTop:
                  "16px",
              }}
            >
              {shoppingResults.map(
                (
                  result,
                  index
                ) => {
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
                          gap:
                            "12px",
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
                          gap:
                            "8px",
                          marginTop:
                            "10px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedResult(
                              result
                            );

                            setManualKoreaPrice(
                              ""
                            );
                          }}
                        >
                          {isSelected
                            ? "✅ 이 상품 선택됨"
                            : "이 상품 선택"}
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

            <button
              type="button"
              onClick={() => {
                setUseManualFallback(
                  true
                );

                setSelectedResult(
                  null
                );
              }}
              style={{
                marginTop:
                  "16px",
                width:
                  "100%",
              }}
            >
              🔍 찾는 상품이
              없어요
            </button>
          </>
        )}

      {/* 검색 결과 없음 */}

      {!shoppingLoading &&
        useManualFallback && (
          <div>
            <hr />

            <h3>
              다른 쇼핑몰에서
              확인
            </h3>

            {shoppingError && (
              <p>
                ⚠️{" "}
                {shoppingError}
              </p>
            )}

            <p>
              Google Shopping에서
              동일한 상품을 찾지
              못했습니다.
            </p>

            <p>
              네이버쇼핑 또는
              쿠팡에서 현재
              가격을 확인한 뒤
              입력해주세요.
            </p>

            <div
              style={{
                display:
                  "grid",
                gap:
                  "10px",
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
                🟢 네이버쇼핑에서
                확인
              </button>

              {/* 기존 쿠팡 Google 경유 버튼 그대로 유지 */}

              <button
                type="button"
                onClick={() =>
                  openShoppingSite(
                    coupangUrl
                  )
                }
              >
                🔎 Google에서 쿠팡 상품 찾기
              </button>
            </div>

            <label htmlFor="manual-korea-price">
              확인한 한국 가격
              (원)
            </label>

            <input
              id="manual-korea-price"
              type="number"
              min="0"
              value={
                manualKoreaPrice
              }
              onChange={(e) => {
                setManualKoreaPrice(
                  e.target.value
                );

                setSelectedResult(
                  null
                );
              }}
              placeholder="예: 12000"
            />

            {shoppingResults.length >
              0 && (
              <button
                type="button"
                onClick={() => {
                  setUseManualFallback(
                    false
                  );

                  setManualKoreaPrice(
                    ""
                  );
                }}
                style={{
                  marginTop:
                    "12px",
                }}
              >
                ← Google 검색
                결과 다시 보기
              </button>
            )}
          </div>
        )}

      {/* 선택된 한국 가격 */}

      {koreaPriceNumber >
        0 && (
        <>
          <hr />

          <p>
            🇰🇷 비교할 한국
            가격:{" "}
            <strong>
              ₩
              {koreaPriceNumber.toLocaleString()}
            </strong>
          </p>

          {selectedResult && (
            <small>
              {
                selectedResult.source
              }{" "}
              /{" "}
              {
                selectedResult.title
              }
            </small>
          )}
        </>
      )}

      {/* 비교 결과 */}

      {japanPriceNumber >
        0 &&
        koreaPriceNumber >
          0 &&
        !exchangeLoading && (
          <div>
            <hr />

            <h3>
              비교 결과
            </h3>

            <p>
              🇯🇵 일본 구매
              예상:{" "}
              <strong>
                ₩
                {japanPriceKrw.toLocaleString()}
              </strong>
            </p>

            <p>
              🇰🇷 한국 구매
              예상:{" "}
              <strong>
                ₩
                {koreaPriceNumber.toLocaleString()}
              </strong>
            </p>

            {saving > 0 ? (
              <div>
                <h3>
                  ✅ 일본 구매
                  추천
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
            ) : saving <
              0 ? (
              <div>
                <h3>
                  🇰🇷 한국 구매
                  추천
                </h3>

                <p>
                  한국에서
                  구매하면 약 ₩
                  {Math.abs(
                    saving
                  ).toLocaleString()}{" "}
                  절약할 수
                  있습니다.
                </p>
              </div>
            ) : (
              <div>
                <h3>
                  🤔 가격이
                  같습니다
                </h3>

                <p>
                  편의성과 수하물
                  공간을 고려해
                  구매처를
                  선택하세요.
                </p>
              </div>
            )}

            {/* 구매 정보 */}

            <div
              style={{
                marginTop:
                  "20px",
                marginBottom:
                  "18px",
                padding:
                  "16px",
                border:
                  "1px solid #e5e7eb",
                borderRadius:
                  "14px",
                background:
                  "#f9fafb",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                }}
              >
                🏪 구매 정보
              </h3>

              {/* 날짜 */}

              <div
                style={{
                  marginBottom:
                    "14px",
                }}
              >
                <label
                  htmlFor="purchase-date"
                  style={{
                    display:
                      "block",
                    marginBottom:
                      "6px",
                    fontWeight:
                      600,
                  }}
                >
                  구매 날짜
                </label>

                <input
                  id="purchase-date"
                  type="date"
                  value={
                    purchaseDate
                  }
                  onChange={(e) =>
                    setPurchaseDate(
                      e.target
                        .value
                    )
                  }
                  style={{
                    width:
                      "100%",
                    boxSizing:
                      "border-box",
                  }}
                />
              </div>

              {/* 매장명 */}

              <div
                style={{
                  marginBottom:
                    "14px",
                }}
              >
                <label
                  htmlFor="store-name"
                  style={{
                    display:
                      "block",
                    marginBottom:
                      "6px",
                    fontWeight:
                      600,
                  }}
                >
                  구매 매장
                </label>

                <input
                  id="store-name"
                  type="text"
                  value={
                    storeName
                  }
                  onChange={(e) =>
                    setStoreName(
                      e.target
                        .value
                    )
                  }
                  placeholder="예: 돈키호테 시부야점"
                  style={{
                    width:
                      "100%",
                    boxSizing:
                      "border-box",
                  }}
                />
              </div>

              {/* 미등록 상품 */}

              {taxFreeEligible ===
                undefined && (
                <div
                  style={{
                    marginBottom:
                      "14px",
                    padding:
                      "12px",
                    background:
                      "#ffffff",
                    borderRadius:
                      "10px",
                    border:
                      "1px solid #e5e7eb",
                  }}
                >
                  <strong>
                    상품 면세 정보
                  </strong>

                  <label
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap:
                        "8px",
                      marginTop:
                        "12px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        manualTaxFreeEligible
                      }
                      onChange={(
                        e
                      ) => {
                        const checked =
                          e
                            .target
                            .checked;

                        setManualTaxFreeEligible(
                          checked
                        );

                        if (
                          !checked
                        ) {
                          setTaxFreeAvailableAtStore(
                            false
                          );
                        }
                      }}
                    />

                    이 상품은 면세 대상 상품이에요
                  </label>

                  <div
                    style={{
                      marginTop:
                        "12px",
                    }}
                  >
                    <label>
                      소비세율{" "}
                      <select
                        value={
                          manualTaxRate
                        }
                        onChange={(
                          e
                        ) =>
                          setManualTaxRate(
                            Number(
                              e
                                .target
                                .value
                            ) as
                              | 0.1
                              | 0.08
                          )
                        }
                      >
                        <option
                          value={
                            0.1
                          }
                        >
                          10%
                        </option>

                        <option
                          value={
                            0.08
                          }
                        >
                          8%
                        </option>
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {/* 면세 가능 상품 */}

              {effectiveTaxFreeEligible ? (
                <div
                  style={{
                    padding:
                      "12px",
                    borderRadius:
                      "10px",
                    background:
                      "#ecfdf3",
                    border:
                      "1px solid #a7f3d0",
                  }}
                >
                  <strong>
                    ✅ 면세 대상 상품
                  </strong>

                  <p
                    style={{
                      margin:
                        "8px 0 12px",
                    }}
                  >
                    소비세율:{" "}
                    <strong>
                      {Math.round(
                        effectiveTaxRate *
                          100
                      )}
                      %
                    </strong>
                  </p>

                  <label
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "flex-start",
                      gap:
                        "8px",
                      cursor:
                        "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        taxFreeAvailableAtStore
                      }
                      onChange={(
                        e
                      ) =>
                        setTaxFreeAvailableAtStore(
                          e
                            .target
                            .checked
                        )
                      }
                      style={{
                        width:
                          "18px",
                        height:
                          "18px",
                      }}
                    />

                    <span>
                      이 상품은
                      <strong>
                        {" "}
                        이 매장에서
                        실제 Tax-Free
                        적용 가능
                      </strong>
                      해요
                    </span>
                  </label>

                  {!taxFreeAvailableAtStore && (
                    <p
                      style={{
                        margin:
                          "10px 0 0",
                        fontSize:
                          "12px",
                        color:
                          "#667085",
                      }}
                    >
                      상품 자체는
                      면세 대상이어도
                      매장 또는 상품
                      조건에 따라
                      Tax-Free 처리가
                      안 될 수 있습니다.
                    </p>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    padding:
                      "12px",
                    borderRadius:
                      "10px",
                    background:
                      "#fff7ed",
                    border:
                      "1px solid #fed7aa",
                  }}
                >
                  <strong>
                    ⚠️ 면세 적용 대상이 아닌 상품입니다.
                  </strong>

                  <p
                    style={{
                      margin:
                        "8px 0 0",
                      fontSize:
                        "12px",
                      color:
                        "#667085",
                    }}
                  >
                    이 상품은 면세
                    환급 계산에서
                    제외됩니다.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={
                addToCart
              }
            >
              🛒 장바구니에
              담기
            </button>
          </div>
        )}
    </div>
  );
}

export default PriceComparison;