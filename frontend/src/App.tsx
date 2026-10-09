import { useState } from "react";
import "./App.css";
import BarcodeScanner from "./components/BarcodeScanner";
import Cart from "./components/Cart";

type Page = "scan" | "cart";

function App() {
  const [page, setPage] = useState<Page>("scan");

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>JapanWorth</h1>
          <p>일본에서 살까? 한국에서 살까?</p>
        </div>
      </header>

      <main className="app-content">
        {page === "scan" && <BarcodeScanner />}
        {page === "cart" && <Cart />}
      </main>

      <nav className="bottom-nav">
        <button
          type="button"
          className={page === "scan" ? "active" : ""}
          onClick={() => setPage("scan")}
        >
          <span className="nav-icon">📷</span>
          <span>스캔</span>
        </button>

        <button
          type="button"
          className={page === "cart" ? "active" : ""}
          onClick={() => setPage("cart")}
        >
          <span className="nav-icon">🛒</span>
          <span>장바구니</span>
        </button>
      </nav>
    </div>
  );
}

export default App;