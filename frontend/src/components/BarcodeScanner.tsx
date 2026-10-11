import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import { products } from "../data/products";
import PriceComparison from "./PriceComparison";

function BarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const controlsRef =
    useRef<{ stop: () => void } | null>(null);

  const [barcode, setBarcode] =
    useState("");

  const [manualBarcode, setManualBarcode] =
    useState("");

  const [isScanning, setIsScanning] =
    useState(false);

  // 5초 동안 인식되지 않았을 때 직접 입력창 표시
  const [
    showManualBarcodeInput,
    setShowManualBarcodeInput,
  ] = useState(false);

  const [
    manualProductName,
    setManualProductName,
  ] = useState("");

  const [
    manualProductConfirmed,
    setManualProductConfirmed,
  ] = useState(false);

  const matchedProduct =
    products.find(
      (product) =>
        product.jan === barcode
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
     * 카메라 시작 후 5초가 지나면
     * 직접 입력 옵션 표시
     */
    const timeoutId =
      window.setTimeout(() => {
        setShowManualBarcodeInput(
          true
        );
      }, 5000);

    const startScanner =
      async () => {
        try {
          const controls =
            await reader.decodeFromConstraints(
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
                  result.getText();

                console.log(
                  "인식된 바코드:",
                  code
                );

                /*
                 * 바코드가 인식되면
                 * 5초 타이머 제거
                 */
                window.clearTimeout(
                  timeoutId
                );

                setBarcode(code);

                setManualBarcode("");

                setShowManualBarcodeInput(
                  false
                );

                setManualProductName(
                  ""
                );

                setManualProductConfirmed(
                  false
                );

                setIsScanning(
                  false
                );

                controlsRef.current?.stop();
              }
            );

          controlsRef.current =
            controls;
        } catch (error) {
          console.error(
            "카메라 실행 오류:",
            error
          );

          /*
           * 카메라 자체가 실행되지 않는 경우에는
           * 바로 직접 입력 가능하게 함
           */
          setShowManualBarcodeInput(
            true
          );

          setIsScanning(false);
        }
      };

    startScanner();

    return () => {
      window.clearTimeout(
        timeoutId
      );

      controlsRef.current?.stop();

      controlsRef.current =
        null;
    };
  }, [isScanning]);

  /*
   * 카메라 스캔 시작
   */
  const startScanning = () => {
    controlsRef.current?.stop();

    controlsRef.current =
      null;

    setBarcode("");

    setManualBarcode("");

    setManualProductName("");

    setManualProductConfirmed(
      false
    );

    setShowManualBarcodeInput(
      false
    );

    setIsScanning(true);
  };

  /*
   * JAN / EAN 직접 입력
   */
  const findManualBarcode = () => {
    const code =
      manualBarcode.trim();

    if (!code) {
      alert(
        "JAN / EAN 코드를 입력해주세요."
      );

      return;
    }

    /*
     * 직접 입력하면 카메라 중지
     */
    controlsRef.current?.stop();

    controlsRef.current =
      null;

    setIsScanning(false);

    setShowManualBarcodeInput(
      false
    );

    setBarcode(code);

    setManualProductName("");

    setManualProductConfirmed(
      false
    );
  };

  /*
   * 미등록 상품명 입력
   */
  const confirmManualProduct =
    () => {
      if (
        !manualProductName.trim()
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

      {/* 스캔 시작 전 */}

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

          {/* 5초 이상 인식되지 않았을 때만 표시 */}

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

              <label htmlFor="manual-barcode">
                JAN / EAN 직접 입력
              </label>

              <input
                id="manual-barcode"
                type="text"
                inputMode="numeric"
                value={
                  manualBarcode
                }
                onChange={(e) =>
                  setManualBarcode(
                    e.target.value.replace(
                      /\D/g,
                      ""
                    )
                  )
                }
                placeholder="예: 4901770056432"
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

      {/* 바코드 확인 완료 */}

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

          {/* 등록된 상품 */}

          {matchedProduct ? (
            <div>
              <hr />

              <h3>
                {matchedProduct.nameKo ??
                  matchedProduct.nameJa ??
                  "상품명 없음"}
              </h3>

              {matchedProduct.nameJa && (
                <p>
                  {
                    matchedProduct.nameJa
                  }
                </p>
              )}

              <p>
                브랜드:{" "}
                <strong>
                  {matchedProduct.brand ??
                    "정보 없음"}
                </strong>
              </p>

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
              />
            </div>
          ) : (
            /*
             * 등록되지 않은 상품
             */
            <div>
              <hr />

              <h3>
                등록되지 않은
                상품입니다
              </h3>

              {!manualProductConfirmed ? (
                <>
                  <p>
                    상품명을 직접
                    입력하면 한국
                    판매가를 검색할
                    수 있어요.
                  </p>

                  <label htmlFor="manual-product-name">
                    상품명
                  </label>

                  <input
                    id="manual-product-name"
                    type="text"
                    value={
                      manualProductName
                    }
                    onChange={(e) =>
                      setManualProductName(
                        e.target
                          .value
                      )
                    }
                    placeholder="예: 모노그래프 치이카와 샤프"
                  />

                  <button
                    type="button"
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
                    jan={
                      barcode
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setManualProductConfirmed(
                        false
                      )
                    }
                  >
                    상품명 다시 입력
                  </button>
                </>
              )}
            </div>
          )}

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