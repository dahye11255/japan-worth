import "./App.css";
import BarcodeScanner from "./components/BarcodeScanner";

function App() {
  return (
    <main>
      <h1>JapanWorth</h1>

      <p>일본에서 살까? 한국에서 살까?</p>

      <BarcodeScanner />
    </main>
  );
}

export default App;
