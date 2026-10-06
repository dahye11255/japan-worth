import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";

function BarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [barcode, setBarcode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isScanning || !videoRef.current) {
      return;
    }

    const codeReader = new BrowserMultiFormatReader();

    let controls:
      | {
          stop: () => void;
        }
      | undefined;

    const startScanner = async () => {
      try {
        controls = await codeReader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (result) {
              setBarcode(result.getText());
            }
          },
        );
      } catch (err) {
        console.error(err);
        setError("카메라를 실행할 수 없습니다.");
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      controls?.stop();
    };
  }, [isScanning]);

  const startScanning = () => {
    setBarcode("");
    setError("");
    setIsScanning(true);
  };

  const stopScanning = () => {
    setIsScanning(false);
  };

  return (
    <div>
      <h2>상품 바코드 스캔</h2>

      {!isScanning && <button onClick={startScanning}>📷 바코드 스캔</button>}

      {isScanning && (
        <>
          <video
            ref={videoRef}
            style={{
              width: "100%",
              maxWidth: "500px",
            }}
          />

          <div>
            <button onClick={stopScanning}>스캔 종료</button>
          </div>
        </>
      )}

      {barcode && (
        <div>
          <h3>인식된 바코드</h3>
          <strong>{barcode}</strong>
        </div>
      )}

      {error && <p>{error}</p>}
    </div>
  );
}

export default BarcodeScanner;
