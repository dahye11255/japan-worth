import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import { products } from "../data/products";

function BarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const [barcode, setBarcode] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  const matchedProduct = products.find((product) => product.jan === barcode);

  useEffect(() => {
    if (!isScanning || !videoRef.current) return;

    const reader = new BrowserMultiFormatReader();

    const startScanner = async () => {
      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (result) {
              const code = result.getText();

              setBarcode(code);
              setIsScanning(false);
              controlsRef.current?.stop();
            }
          },
        );

        controlsRef.current = controls;
      } catch (error) {
        console.error("카메라 실행 오류:", error);
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [isScanning]);

  return (
    <div>
      <h2>상품 바코드 스캔</h2>

      {!isScanning && (
        <button
          onClick={() => {
            setBarcode("");
            setIsScanning(true);
          }}
        >
          📷 바코드 스캔
        </button>
      )}

      {isScanning && (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              maxWidth: 500,
            }}
          />

          <p>바코드를 카메라에 보여주세요.</p>
        </>
      )}

      {barcode && (
        <div>
          <h3>✅ 바코드 인식 완료</h3>

          <p>JAN / EAN 코드</p>
          <strong>{barcode}</strong>

          {matchedProduct ? (
            <div>
              <h3>{matchedProduct.nameKo}</h3>

              <p>{matchedProduct.nameJa}</p>

              <p>브랜드: {matchedProduct.brand}</p>

              <p>한국 가격: ₩{matchedProduct.koreaPrice.toLocaleString()}</p>
            </div>
          ) : (
            <p>등록되지 않은 상품입니다.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default BarcodeScanner;
