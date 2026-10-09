import { useState } from "react";
import "./App.css";
import BarcodeScanner from "./components/BarcodeScanner";
import Cart from "./components/Cart";

type Page = "scan" | "cart";

function App() {
  const [page, setPage] = useState<Page>("scan");

  return (
    <main>
      <h1>JapanWorth</h1>

      <p>
        일본에서 살까? 한국에서 살까?
      </p>

      <nav>
        <button
          type="button"
          onClick={() => setPage("scan")}
        >
          📷 상품 스캔
        </button>

        <button
          type="button"
          onClick={() => setPage("cart")}
        >
          🛒 장바구니 보기
        </button>
      </nav>

      <hr />

      {page === "scan" && <BarcodeScanner />}

      {page === "cart" && <Cart />}
    </main>
  );
}

export default App;