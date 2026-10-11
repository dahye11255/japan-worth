import {
  BrowserMultiFormatReader,
} from "@zxing/browser";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  products,
} from "../data/products";

import PriceComparison
  from "./PriceComparison";

interface ExternalProduct {
  jan: string;

  name: string;

  brand: string;

  category: string;

  imageUrl: string;

  quantity?: string;

  productQuantity?:
    number | null;

  searchKeyword?: string;

  source: string;
}

interface ProductApiResponse {
  found?: boolean;

  product?: ExternalProduct;

  error?: string;
}

function BarcodeScanner() {
  const videoRef =
    useRef<HTMLVideoElement>(
      null
    );

  const controlsRef =
    useRef<{
      stop: () => void;
    } | null>(null);

  const [
    barcode,
    setBarcode,
  ] = useState("");

  const [
    manualBarcode,
    setManualBarcode,
  ] = useState("");

  const [
    isScanning,
    setIsScanning,
  ] = useState(false);

  /*
   * 5초 동안 바코드가
   * 인식되지 않았을 때
   */
  const [
    showManualBarcodeInput,
    setShowManualBarcodeInput,
  ] = useState(false);

  /*
   * 외부 DB 상품
   */
  const [
    externalProduct,
    setExternalProduct,
  ] =
    useState<ExternalProduct | null>(
      null
    );

  const [
    externalLoading,
    setExternalLoading,
  ] = useState(false);

  const [
    externalChecked,
    setExternalChecked,
  ] = useState(false);

  /*
   * 외부 DB에서도
   * 찾지 못한 경우
   */
  const [
    manualProductName,
    setManualProductName,
  ] = useState("");

  const [
    manualProductConfirmed,
    setManualProductConfirmed,
  ] = useState(false);

  /*
   * JapanWorth에 직접
   * 등록해 둔 상품
   */
  const matchedProduct =
    products.find(
      (product) =>
        product.jan ===
        barcode
    );

  /*
   * 카메라 스캔
   */
  useEffect(() => {
    if (
      !isScanning ||
      !videoRef.current
    ) {
      return;
    }

    const reader =
      new BrowserMultiFormatReader();

    /*
     * 5초 후
     * 직접 입력창 표시
     */
    const timeoutId =
      window.setTimeout(
        () => {
          setShowManualBarcodeInput(
            true
          );
        },
        5000
      );

    const startScanner =
      async () => {
        try {
          const controls =
            await reader
              .decodeFromConstraints(
                {
                  audio: false,

                  video: {
                    facingMode: {
                      ideal:
                        "environment",
                    },

                    width: {
                      ideal: 1280,
                    },

                    height: {
                      ideal: 720,
                    },
                  },
                },

                videoRef.current!,

                (result) => {
                  if (!result) {
                    return;
                  }

                  const code =
                    result
                      .getText();

                  console.log(
                    "인식된 바코드:",
                    code
                  );

                  window
                    .clearTimeout(
                      timeoutId
                    );

                  setBarcode(
                    code
                  );

                  setManualBarcode(
                    ""
                  );

                  setExternalProduct(
                    null
                  );

                  setExternalLoading(
                    false
                  );

                  setExternalChecked(
                    false
                  );

                  setManualProductName(
                    ""
                  );

                  setManualProductConfirmed(
                    false
                  );

                  setShowManualBarcodeInput(
                    false
                  );

                  setIsScanning(
                    false
                  );

                  controlsRef
                    .current
                    ?.stop();
                }
              );

          controlsRef.current =
            controls;
        } catch (error) {
          console.error(
            "카메라 실행 오류:",
            error
          );

          setShowManualBarcodeInput(
            true
          );

          setIsScanning(
            false
          );
        }
      };

    startScanner();

    return () => {
      window.clearTimeout(
        timeoutId
      );

      controlsRef
        .current
        ?.stop();

      controlsRef.current =
        null;
    };
  }, [
    isScanning,
  ]);

  /*
   * products.ts에 없는 JAN은
   * /api/product 자동 조회
   */
  useEffect(() => {
    if (!barcode) {
      setExternalProduct(
        null
      );

      setExternalLoading(
        false
      );

      setExternalChecked(
        false
      );

      return;
    }

    /*
     * 직접 등록한 상품이면
     * 외부 API를 호출하지 않음
     */
    if (matchedProduct) {
      setExternalProduct(
        null
      );

      setExternalLoading(
        false
      );

      setExternalChecked(
        true
      );

      return;
    }

    const fetchExternalProduct =
      async () => {
        try {
          setExternalLoading(
            true
          );

          setExternalChecked(
            false
          );

          setExternalProduct(
            null
          );

          const response =
            await fetch(
              `/api/product?jan=${encodeURIComponent(
                barcode
              )}`
            );

          const rawText =
            await response.text();

          let data:
            ProductApiResponse;

          try {
            data =
              JSON.parse(
                rawText
              );
          } catch {
            throw new Error(
              "상품 조회 API 응답을 읽지 못했습니다."
            );
          }

          if (
            !response.ok
          ) {
            throw new Error(
              data.error ??
                "상품 정보 조회에 실패했습니다."
            );
          }

          if (
            data.found &&
            data.product
          ) {
            setExternalProduct(
              data.product
            );
          }
        } catch (error) {
          console.error(
            "외부 상품 조회 오류:",
            error
          );
        } finally {
          setExternalLoading(
            false
          );

          setExternalChecked(
            true
          );
        }
      };

    fetchExternalProduct();
  }, [
    barcode,
    matchedProduct,
  ]);

  /*
   * 새 스캔 시작
   */
  const startScanning =
    () => {
      controlsRef
        .current
        ?.stop();

      controlsRef.current =
        null;

      setBarcode("");

      setManualBarcode(
        ""
      );

      setExternalProduct(
        null
      );

      setExternalLoading(
        false
      );

      setExternalChecked(
        false
      );

      setManualProductName(
        ""
      );

      setManualProductConfirmed(
        false
      );

      setShowManualBarcodeInput(
        false
      );

      setIsScanning(
        true
      );
    };

  /*
   * JAN / EAN 직접 입력
   */
  const findManualBarcode =
    () => {
      const code =
        manualBarcode.trim();

      if (!code) {
        alert(
          "JAN / EAN 코드를 입력해주세요."
        );

        return;
      }

      controlsRef
        .current
        ?.stop();

      controlsRef.current =
        null;

      setIsScanning(
        false
      );

      setShowManualBarcodeInput(
        false
      );

      setExternalProduct(
        null
      );

      setExternalLoading(
        false
      );

      setExternalChecked(
        false
      );

      setManualProductName(
        ""
      );

      setManualProductConfirmed(
        false
      );

      setBarcode(
        code
      );
    };

  /*
   * 상품명 직접 입력
   */
  const confirmManualProduct =
    () => {
      if (
        !manualProductName
          .trim()
      ) {
        alert(
          "상품명을 입력해주세요."
        );

        return;
      }

      setManualProductConfirmed(
        true
      );
    };

  return (
    <div>
      <h2>
        상품 바코드 스캔
      </h2>

      {/* 처음 화면 */}

      {!isScanning &&
        !barcode && (
          <button
            type="button"
            onClick={
              startScanning
            }
          >
            📷 바코드 스캔
          </button>
        )}

      {/* 카메라 */}

      {isScanning && (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
          />

          <p>
            바코드를 카메라에
            보여주세요.
          </p>

          {showManualBarcodeInput && (
            <div
              style={{
                marginTop:
                  "18px",
              }}
            >
              <p>
                바코드가 잘
                인식되지 않나요?
              </p>

              <label
                htmlFor=
                  "manual-barcode"
              >
                JAN / EAN 직접 입력
              </label>

              <input
                id=
                  "manual-barcode"
                type="text"
                inputMode=
                  "numeric"
                value={
                  manualBarcode
                }
                onChange={(
                  e
                ) =>
                  setManualBarcode(
                    e.target.value
                      .replace(
                        /\D/g,
                        ""
                      )
                  )
                }
                placeholder=
                  "예: 4901770056432"
              />

              <button
                type="button"
                onClick={
                  findManualBarcode
                }
              >
                🔎 상품 찾기
              </button>
            </div>
          )}
        </>
      )}

      {/* 바코드 확인 */}

      {barcode && (
        <div>
          <hr />

          <h3>
            ✅ 바코드 확인 완료
          </h3>

          <p>
            JAN / EAN 코드
          </p>

          <strong>
            {barcode}
          </strong>

          {/* ==================
              직접 등록 상품
             ================== */}

          {matchedProduct ? (
            <div>
              <hr />

              <h3>
                {matchedProduct
                  .nameKo ??
                  matchedProduct
                    .nameJa ??
                  "상품명 없음"}
              </h3>

              {matchedProduct
                .imageUrl && (
                <img
                  src={
                    matchedProduct
                      .imageUrl
                  }
                  alt={
                    matchedProduct
                      .nameKo ??
                    matchedProduct
                      .nameJa ??
                    "상품 이미지"
                  }
                  style={{
                    width:
                      "160px",

                    height:
                      "160px",

                    objectFit:
                      "contain",

                    display:
                      "block",

                    margin:
                      "16px auto",

                    borderRadius:
                      "12px",
                  }}
                />
              )}

              {matchedProduct
                .nameJa && (
                <p>
                  {
                    matchedProduct
                      .nameJa
                  }
                </p>
              )}

              <p>
                브랜드:{" "}

                <strong>
                  {matchedProduct
                    .brand ??
                    "정보 없음"}
                </strong>
              </p>

              <div
                style={{
                  marginTop:
                    "14px",

                  marginBottom:
                    "18px",

                  padding:
                    "14px",

                  borderRadius:
                    "12px",

                  background:
                    matchedProduct
                      .taxFreeEligible
                      ? "#ecfdf3"
                      : "#fff7ed",

                  border:
                    matchedProduct
                      .taxFreeEligible
                      ? "1px solid #a7f3d0"
                      : "1px solid #fed7aa",
                }}
              >
                <strong>
                  {matchedProduct
                    .taxFreeEligible
                    ? "✅ 면세 가능 상품"
                    : "⚠️ 면세 제외 상품"}
                </strong>

                <p
                  style={{
                    margin:
                      "8px 0 4px",
                  }}
                >
                  상품 분류:{" "}
                  {
                    matchedProduct
                      .taxCategory
                  }
                </p>

                <p
                  style={{
                    margin:
                      "4px 0",
                  }}
                >
                  소비세율:{" "}

                  <strong>
                    {Math.round(
                      matchedProduct
                        .taxRate *
                        100
                    )}
                    %
                  </strong>
                </p>



                {matchedProduct.isAlcohol && (
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontWeight: 700,
                    }}
                  >
                    🍶 주류 상품입니다.
                  </p>
                )}

                {/* 항공기 수하물 반입 안내 */}
                {matchedProduct.isAlcohol &&
                typeof matchedProduct.alcoholPercent === "number" &&
                matchedProduct.alcoholPercent > 70 ? (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "14px",
                      background: "#fef2f2",
                      border: "1px solid #fca5a5",
                      borderRadius: "12px",
                    }}
                  >
                    <strong>
                      🚫 기내·위탁수하물 모두 반입 불가
                    </strong>

                    <p style={{ margin: "8px 0 0" }}>
                      알코올 도수 {matchedProduct.alcoholPercent}%로
                      항공기 운송이 금지되는 상품입니다.
                    </p>
                  </div>
                ) : typeof matchedProduct.volumeMl === "number" &&
                  matchedProduct.volumeMl > 100 ? (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "14px",
                      background: "#fff7ed",
                      border: "1px solid #fdba74",
                      borderRadius: "12px",
                    }}
                  >
                    <strong>
                      ⚠️ 기내 반입 제한 · 위탁수하물 권장
                    </strong>

                    <p style={{ margin: "8px 0" }}>
                      이 상품은 {matchedProduct.volumeMl}mL 액체류입니다.
                      일반적인 국제선 기내 반입 기준인
                      100mL를 초과하므로 부치는 캐리어에 넣으세요.
                    </p>

                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: "#7c2d12",
                      }}
                    >
                      ※ 보안검색 후 구매한 면세품은 예외가
                      있을 수 있으며, 항공사와 경유지
                      규정을 확인하세요.
                    </p>
                  </div>
                ) : null}

                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: "12px",
                    color: "#667085",
                    lineHeight: 1.5,
                  }}
                >
                  ※ 실제 면세 환급은
                  Tax-Free 매장 여부와
                  구매 금액 등 환급
                  조건을 충족해야 합니다.
                </p>
              </div>

              <PriceComparison
                productName={
                  matchedProduct.nameKo ??
                  matchedProduct.nameJa ??
                  "상품명 없음"
                }
                searchKeyword={
                  matchedProduct.searchKeyword
                }
                jan={
                  matchedProduct.jan
                }
                taxRate={
                  matchedProduct.taxRate
                }
                taxFreeEligible={
                  matchedProduct.taxFreeEligible
                }
              />
            </div>


          ) : externalLoading ? (
            /*
             * 외부 상품 검색 중
             */
            <div>
              <hr />

              <p>
                🔎 외부 상품 DB에서
                상품 정보를 찾는 중...
              </p>
            </div>
          ) : externalProduct ? (
            /*
             * 외부 상품 검색 성공
             */
            <div>
              <hr />

              <div
                style={{
                  padding:
                    "10px 12px",

                  borderRadius:
                    "10px",

                  background:
                    "#eef4ff",

                  marginBottom:
                    "14px",
                }}
              >
                <strong>
                  🌐 외부 상품 DB에서
                  찾았습니다
                </strong>
              </div>

              <h3>
                {
                  externalProduct
                    .name
                }
              </h3>

              {externalProduct
                .imageUrl && (
                <img
                  src={
                    externalProduct
                      .imageUrl
                  }
                  alt={
                    externalProduct
                      .name
                  }
                  style={{
                    width:
                      "160px",

                    height:
                      "160px",

                    objectFit:
                      "contain",

                    display:
                      "block",

                    margin:
                      "16px auto",

                    borderRadius:
                      "12px",
                  }}
                />
              )}

              <p>
                브랜드:{" "}

                <strong>
                  {externalProduct
                    .brand ||
                    "정보 없음"}
                </strong>
              </p>

              {externalProduct
                .category && (
                <p>
                  카테고리:{" "}
                  {
                    externalProduct
                      .category
                  }
                </p>
              )}

              {externalProduct
                .quantity && (
                <p>
                  용량 / 중량:{" "}
                  {
                    externalProduct
                      .quantity
                  }
                </p>
              )}

              <p
                style={{
                  fontSize:
                    "12px",

                  color:
                    "#667085",
                }}
              >
                상품정보 출처:{" "}
                {
                  externalProduct
                    .source
                }
              </p>

              {/*
               * 지금 디버깅할 때
               * 실제 한국 검색어 확인용
               */}
              <p
                style={{
                  fontSize:
                    "12px",

                  color:
                    "#667085",

                  wordBreak:
                    "break-word",
                }}
              >
                한국 가격 검색어:{" "}

                <strong>
                  {externalProduct
                    .searchKeyword ??
                    externalProduct
                      .name}
                </strong>
              </p>

              <PriceComparison
                productName={
                  externalProduct
                    .name
                }
                searchKeyword={
                  externalProduct
                    .searchKeyword ??
                  externalProduct
                    .name
                }
                jan={
                  barcode
                }
              />
            </div>
          ) : externalChecked ? (
            /*
             * 외부 DB에서도 실패
             */
            <div>
              <hr />

              <h3>
                등록되지 않은 상품입니다
              </h3>

              {!manualProductConfirmed ? (
                <>
                  <p>
                    외부 상품 DB에서도
                    상품 정보를 찾지
                    못했습니다.
                  </p>

                  <p>
                    상품명을 직접 입력하면
                    한국 판매가를 검색할 수
                    있어요.
                  </p>

                  <label
                    htmlFor=
                      "manual-product-name"
                  >
                    상품명
                  </label>

                  <input
                    id=
                      "manual-product-name"
                    type=
                      "text"
                    value={
                      manualProductName
                    }
                    onChange={(
                      e
                    ) =>
                      setManualProductName(
                        e.target
                          .value
                      )
                    }
                    placeholder=
                      "예: 로토 멘소래담 립밤"
                  />

                  <button
                    type=
                      "button"
                    onClick={
                      confirmManualProduct
                    }
                  >
                    🔎 이 상품으로
                    가격 비교
                  </button>
                </>
              ) : (
                <>
                  <h3>
                    {
                      manualProductName
                    }
                  </h3>

                  <PriceComparison
                    productName={
                      manualProductName
                    }
                    searchKeyword={
                      manualProductName
                    }
                    jan={
                      barcode
                    }
                  />

                  <button
                    type=
                      "button"
                    onClick={() =>
                      setManualProductConfirmed(
                        false
                      )
                    }
                    style={{
                      marginTop:
                        "12px",
                    }}
                  >
                    상품명 다시 입력
                  </button>
                </>
              )}
            </div>
          ) : null}

          <button
            type="button"
            onClick={
              startScanning
            }
            style={{
              marginTop:
                "20px",
            }}
          >
            📷 다른 상품 스캔
          </button>
        </div>
      )}
    </div>
  );
}

export default BarcodeScanner;