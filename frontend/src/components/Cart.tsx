import { useEffect, useState } from "react";

interface CartItem {
  jan: string;
  productName: string;
  japanPrice: number;
  japanPriceKrw: number;
  koreaPrice: number;
  saving: number;
  quantity: number;
}

function Cart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem("japanWorthCart");

    if (savedCart) {
      try {
        const parsedCart: CartItem[] = JSON.parse(savedCart);
        setCart(parsedCart);
      } catch (error) {
        console.error("장바구니 불러오기 오류:", error);
      }
    }
  }, []);

  const totalJapanPrice = cart.reduce(
    (total, item) =>
      total + item.japanPriceKrw * item.quantity,
    0
  );

  const totalKoreaPrice = cart.reduce(
    (total, item) =>
      total + item.koreaPrice * item.quantity,
    0
  );

  const totalSaving =
    totalKoreaPrice - totalJapanPrice;

  return (
    <div>
      <h2>🛒 장바구니</h2>

      {cart.length === 0 ? (
        <p>장바구니가 비어 있습니다.</p>
      ) : (
        <>
          {cart.map((item) => (
            <div key={item.jan}>
              <h3>{item.productName}</h3>

              <p>
                수량: {item.quantity}개
              </p>

              <p>
                일본 가격: ¥
                {item.japanPrice.toLocaleString()}
              </p>

              <p>
                일본 원화 환산: ₩
                {(
                  item.japanPriceKrw *
                  item.quantity
                ).toLocaleString()}
              </p>

              <p>
                한국 가격: ₩
                {(
                  item.koreaPrice *
                  item.quantity
                ).toLocaleString()}
              </p>

              <hr />
            </div>
          ))}

          <h3>장바구니 요약</h3>

          <p>
            일본 구매 예상:{" "}
            <strong>
              ₩{totalJapanPrice.toLocaleString()}
            </strong>
          </p>

          <p>
            한국 구매 예상:{" "}
            <strong>
              ₩{totalKoreaPrice.toLocaleString()}
            </strong>
          </p>

          {totalSaving > 0 ? (
            <p>
              ✅ 일본에서 구매하면 총{" "}
              <strong>
                ₩{totalSaving.toLocaleString()}
              </strong>{" "}
              절약 예상
            </p>
          ) : (
            <p>
              🇰🇷 한국 구매가 총{" "}
              <strong>
                ₩
                {Math.abs(
                  totalSaving
                ).toLocaleString()}
              </strong>{" "}
              저렴합니다.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default Cart;