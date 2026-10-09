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

const CART_KEY = "japanWorthCart";

function Cart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem(CART_KEY);

    if (savedCart) {
      try {
        const parsedCart: CartItem[] = JSON.parse(savedCart);
        setCart(parsedCart);
      } catch (error) {
        console.error("장바구니 불러오기 오류:", error);
      }
    }
  }, []);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);

    localStorage.setItem(
      CART_KEY,
      JSON.stringify(newCart)
    );
  };

  const increaseQuantity = (jan: string) => {
    const newCart = cart.map((item) =>
      item.jan === jan
        ? {
            ...item,
            quantity: item.quantity + 1,
          }
        : item
    );

    saveCart(newCart);
  };

  const decreaseQuantity = (jan: string) => {
    const newCart = cart
      .map((item) =>
        item.jan === jan
          ? {
              ...item,
              quantity: item.quantity - 1,
            }
          : item
      )
      .filter((item) => item.quantity > 0);

    saveCart(newCart);
  };

  const removeItem = (jan: string) => {
    const newCart = cart.filter(
      (item) => item.jan !== jan
    );

    saveCart(newCart);
  };

  const clearCart = () => {
    const confirmed = window.confirm(
      "장바구니를 모두 비울까요?"
    );

    if (!confirmed) return;

    saveCart([]);
  };

  const totalQuantity = cart.reduce(
    (total, item) =>
      total + item.quantity,
    0
  );

  const totalJapanYen = cart.reduce(
    (total, item) =>
      total + item.japanPrice * item.quantity,
    0
  );

  const totalJapanPriceKrw = cart.reduce(
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
    totalKoreaPrice - totalJapanPriceKrw;

  return (
    <div>
      <h2>🛒 장바구니</h2>

      {cart.length === 0 ? (
        <p>장바구니가 비어 있습니다.</p>
      ) : (
        <>
          <p>
            총 {totalQuantity}개 상품
          </p>

          {cart.map((item) => (
            <div key={item.jan}>
              <h3>{item.productName}</h3>

              <p>
                JAN: {item.jan}
              </p>

              <p>
                일본 개당 가격: ¥
                {item.japanPrice.toLocaleString()}
              </p>

              <div>
                <button
                  type="button"
                  onClick={() =>
                    decreaseQuantity(item.jan)
                  }
                >
                  -
                </button>

                <strong>
                  {" "}
                  {item.quantity}개{" "}
                </strong>

                <button
                  type="button"
                  onClick={() =>
                    increaseQuantity(item.jan)
                  }
                >
                  +
                </button>
              </div>

              <p>
                일본 구매 예상: ₩
                {(
                  item.japanPriceKrw *
                  item.quantity
                ).toLocaleString()}
              </p>

              <p>
                한국 구매 예상: ₩
                {(
                  item.koreaPrice *
                  item.quantity
                ).toLocaleString()}
              </p>

              <button
                type="button"
                onClick={() =>
                  removeItem(item.jan)
                }
              >
                🗑️ 삭제
              </button>

              <hr />
            </div>
          ))}

          <h3>장바구니 요약</h3>

          <p>
            일본 현지 총액:{" "}
            <strong>
              ¥{totalJapanYen.toLocaleString()}
            </strong>
          </p>

          <p>
            일본 구매 예상:{" "}
            <strong>
              ₩
              {totalJapanPriceKrw.toLocaleString()}
            </strong>
          </p>

          <p>
            한국 구매 예상:{" "}
            <strong>
              ₩
              {totalKoreaPrice.toLocaleString()}
            </strong>
          </p>

          {totalSaving > 0 ? (
            <p>
              ✅ 일본에서 구매하면 총{" "}
              <strong>
                ₩
                {totalSaving.toLocaleString()}
              </strong>{" "}
              절약 예상
            </p>
          ) : totalSaving < 0 ? (
            <p>
              🇰🇷 한국에서 구매하면 총{" "}
              <strong>
                ₩
                {Math.abs(
                  totalSaving
                ).toLocaleString()}
              </strong>{" "}
              절약 예상
            </p>
          ) : (
            <p>
              🤔 한국과 일본의 예상 구매 가격이 같습니다.
            </p>
          )}

          <button
            type="button"
            onClick={clearCart}
          >
            장바구니 전체 비우기
          </button>
        </>
      )}
    </div>
  );
}

export default Cart;