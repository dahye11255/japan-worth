import {
  useEffect,
  useState,
} from "react";

interface CartItem {
  jan: string;
  productName: string;

  japanPrice: number;
  japanPriceKrw: number;

  koreaPrice: number;
  saving: number;

  quantity: number;

  purchaseDate: string;
  storeName: string;

  taxRate: 0.1 | 0.08;

  // 상품 자체가 면세 가능
  taxFreeEligible: boolean;

  // 실제 해당 매장에서 면세 가능
  taxFreeAvailableAtStore: boolean;
}

interface CartGroup {
  purchaseDate: string;
  storeName: string;
  items: CartItem[];
}

const CART_KEY =
  "japanWorthCart";

const TAX_FREE_MINIMUM =
  5000;

/*
 * 장바구니 아이템 구분용
 *
 * 같은 JAN이라도
 * 날짜 / 매장이 다르면
 * 다른 아이템으로 취급
 */
function getItemKey(
  item: CartItem
) {
  return [
    item.jan,
    item.purchaseDate,
    item.storeName,
    item.taxFreeAvailableAtStore
      ? "taxfree"
      : "normal",
  ].join("::");
}

/*
 * 세금 포함 가격에서
 * 세전 가격 계산
 */
function getTaxExcludedPrice(
  taxIncludedPrice: number,
  taxRate: 0.1 | 0.08
) {
  return Math.floor(
    taxIncludedPrice /
      (1 + taxRate)
  );
}

/*
 * 날짜 + 매장별 그룹화
 */
function groupCartItems(
  cart: CartItem[]
): CartGroup[] {
  const groups: CartGroup[] =
    [];

  cart.forEach((item) => {
    const purchaseDate =
      item.purchaseDate ||
      "날짜 미지정";

    const storeName =
      item.storeName ||
      "매장 미지정";

    const existingGroup =
      groups.find(
        (group) =>
          group.purchaseDate ===
            purchaseDate &&
          group.storeName ===
            storeName
      );

    if (existingGroup) {
      existingGroup.items.push(
        item
      );
    } else {
      groups.push({
        purchaseDate,
        storeName,
        items: [item],
      });
    }
  });

  /*
   * 날짜순 정렬
   */
  return groups.sort((a, b) =>
    a.purchaseDate.localeCompare(
      b.purchaseDate
    )
  );
}

function Cart() {
  const [cart, setCart] =
    useState<CartItem[]>(
      []
    );

  /*
   * 장바구니 불러오기
   */
  useEffect(() => {
    const savedCart =
      localStorage.getItem(
        CART_KEY
      );

    if (!savedCart) {
      return;
    }

    try {
      const parsedCart =
        JSON.parse(
          savedCart
        );

      /*
       * 이전 버전 장바구니도
       * 앱이 깨지지 않도록 보정
       */
      const migratedCart: CartItem[] =
        parsedCart.map(
          (
            item: Partial<CartItem>
          ) => ({
            jan:
              item.jan ?? "",

            productName:
              item.productName ??
              "상품명 없음",

            japanPrice:
              item.japanPrice ??
              0,

            japanPriceKrw:
              item.japanPriceKrw ??
              0,

            koreaPrice:
              item.koreaPrice ??
              0,

            saving:
              item.saving ??
              0,

            quantity:
              item.quantity ??
              1,

            purchaseDate:
              item.purchaseDate ??
              "날짜 미지정",

            storeName:
              item.storeName ??
              "매장 미지정",

            taxRate:
              item.taxRate ===
              0.08
                ? 0.08
                : 0.1,

            taxFreeEligible:
              item.taxFreeEligible ??
              false,

            taxFreeAvailableAtStore:
              item.taxFreeAvailableAtStore ??
              false,
          })
        );

      setCart(
        migratedCart
      );
    } catch (error) {
      console.error(
        "장바구니 불러오기 오류:",
        error
      );
    }
  }, []);

  const saveCart = (
    newCart: CartItem[]
  ) => {
    setCart(newCart);

    localStorage.setItem(
      CART_KEY,
      JSON.stringify(
        newCart
      )
    );
  };

  /*
   * 수량 +
   */
  const increaseQuantity = (
    targetItem: CartItem
  ) => {
    const targetKey =
      getItemKey(
        targetItem
      );

    const newCart =
      cart.map((item) =>
        getItemKey(item) ===
        targetKey
          ? {
              ...item,
              quantity:
                item.quantity +
                1,
            }
          : item
      );

    saveCart(newCart);
  };

  /*
   * 수량 -
   */
  const decreaseQuantity = (
    targetItem: CartItem
  ) => {
    const targetKey =
      getItemKey(
        targetItem
      );

    const newCart =
      cart
        .map((item) =>
          getItemKey(
            item
          ) === targetKey
            ? {
                ...item,

                quantity:
                  item.quantity -
                  1,
              }
            : item
        )
        .filter(
          (item) =>
            item.quantity >
            0
        );

    saveCart(newCart);
  };

  /*
   * 상품 삭제
   */
  const removeItem = (
    targetItem: CartItem
  ) => {
    const targetKey =
      getItemKey(
        targetItem
      );

    const newCart =
      cart.filter(
        (item) =>
          getItemKey(
            item
          ) !== targetKey
      );

    saveCart(newCart);
  };

  const clearCart = () => {
    const confirmed =
      window.confirm(
        "장바구니를 모두 비울까요?"
      );

    if (!confirmed) {
      return;
    }

    saveCart([]);
  };

  /*
   * 날짜 + 매장 그룹
   */
  const groups =
    groupCartItems(cart);

  /*
   * 전체 개수
   */
  const totalQuantity =
    cart.reduce(
      (total, item) =>
        total +
        item.quantity,
      0
    );

  /*
   * 전체 일본 결제 예정액
   */
  const totalJapanYen =
    cart.reduce(
      (total, item) =>
        total +
        item.japanPrice *
          item.quantity,
      0
    );

  /*
   * 환급 전 일본 원화 환산액
   */
  const totalJapanPriceKrw =
    cart.reduce(
      (total, item) =>
        total +
        item.japanPriceKrw *
          item.quantity,
      0
    );

  /*
   * 한국 구매 가격
   */
  const totalKoreaPrice =
    cart.reduce(
      (total, item) =>
        total +
        item.koreaPrice *
          item.quantity,
      0
    );

  /*
   * 전체 예상 환급액
   */
  let totalRefundYen = 0;
  let totalRefundKrw = 0;

  groups.forEach(
    (group) => {
      /*
       * 이 그룹에서
       * 실제 면세 가능한 상품만
       */
      const eligibleItems =
        group.items.filter(
          (item) =>
            item.taxFreeEligible &&
            item.taxFreeAvailableAtStore
        );

      /*
       * 면세 대상 세전 합계
       */
      const eligibleTaxExcludedTotal =
        eligibleItems.reduce(
          (
            total,
            item
          ) => {
            const lineTotal =
              item.japanPrice *
              item.quantity;

            return (
              total +
              getTaxExcludedPrice(
                lineTotal,
                item.taxRate
              )
            );
          },
          0
        );

      /*
       * 같은 날짜 + 같은 매장에서
       * 세전 5,000엔 이상일 때만
       * 환급 가능
       */
      const qualifies =
        eligibleTaxExcludedTotal >=
        TAX_FREE_MINIMUM;

      if (!qualifies) {
        return;
      }

      eligibleItems.forEach(
        (item) => {
          const lineTotal =
            item.japanPrice *
            item.quantity;

          const taxExcluded =
            getTaxExcludedPrice(
              lineTotal,
              item.taxRate
            );

          const taxAmount =
            lineTotal -
            taxExcluded;

          totalRefundYen +=
            taxAmount;

          /*
           * 상품 등록 당시의
           * 환율을 이용해 원화 환산
           */
          const itemRate =
            item.japanPrice >
            0
              ? item.japanPriceKrw /
                item.japanPrice
              : 0;

          totalRefundKrw +=
            Math.round(
              taxAmount *
                itemRate
            );
        }
      );
    }
  );

  /*
   * 환급 이후 실제 일본 구매 예상
   */
  const totalAfterRefundYen =
    totalJapanYen -
    totalRefundYen;

  const totalAfterRefundKrw =
    totalJapanPriceKrw -
    totalRefundKrw;

  /*
   * 최종 비교는 환급 후 금액 사용
   */
  const totalSavingAfterRefund =
    totalKoreaPrice -
    totalAfterRefundKrw;

  return (
    <div>
      <h2>
        🛒 장바구니
      </h2>

      {cart.length ===
      0 ? (
        <p>
          장바구니가 비어
          있습니다.
        </p>
      ) : (
        <>
          <p>
            총{" "}
            <strong>
              {totalQuantity}
            </strong>
            개 상품
          </p>

          {groups.map(
            (
              group,
              groupIndex
            ) => {
              /*
               * 그룹 전체 일본 가격
               */
              const groupTotalYen =
                group.items.reduce(
                  (
                    total,
                    item
                  ) =>
                    total +
                    item.japanPrice *
                      item.quantity,
                  0
                );

              /*
               * 실제 면세 처리 가능한 상품
               */
              const eligibleItems =
                group.items.filter(
                  (item) =>
                    item.taxFreeEligible &&
                    item.taxFreeAvailableAtStore
                );

              /*
               * 세전 면세 대상 합계
               */
              const eligibleTaxExcludedTotal =
                eligibleItems.reduce(
                  (
                    total,
                    item
                  ) => {
                    const lineTotal =
                      item.japanPrice *
                      item.quantity;

                    return (
                      total +
                      getTaxExcludedPrice(
                        lineTotal,
                        item.taxRate
                      )
                    );
                  },
                  0
                );

              /*
               * ¥5,000 기준 충족
               */
              const qualifies =
                eligibleTaxExcludedTotal >=
                TAX_FREE_MINIMUM;

              /*
               * 부족 금액
               */
              const remaining =
                Math.max(
                  0,
                  TAX_FREE_MINIMUM -
                    eligibleTaxExcludedTotal
                );

              /*
               * 예상 환급액
               */
              const groupRefundYen =
                qualifies
                  ? eligibleItems.reduce(
                      (
                        total,
                        item
                      ) => {
                        const lineTotal =
                          item.japanPrice *
                          item.quantity;

                        const taxExcluded =
                          getTaxExcludedPrice(
                            lineTotal,
                            item.taxRate
                          );

                        return (
                          total +
                          (lineTotal -
                            taxExcluded)
                        );
                      },
                      0
                    )
                  : 0;

              const groupAfterRefund =
                groupTotalYen -
                groupRefundYen;

              return (
                <section
                  key={`${group.purchaseDate}-${group.storeName}-${groupIndex}`}
                  style={{
                    marginBottom:
                      "28px",

                    border:
                      "1px solid #e5e7eb",

                    borderRadius:
                      "16px",

                    overflow:
                      "hidden",

                    background:
                      "#ffffff",
                  }}
                >
                  {/* 그룹 헤더 */}

                  <div
                    style={{
                      padding:
                        "16px",

                      background:
                        "#f8fafc",

                      borderBottom:
                        "1px solid #e5e7eb",
                    }}
                  >
                    <div
                      style={{
                        fontWeight:
                          800,

                        fontSize:
                          "17px",
                      }}
                    >
                      📅{" "}
                      {
                        group.purchaseDate
                      }
                    </div>

                    <div
                      style={{
                        marginTop:
                          "6px",

                        fontWeight:
                          700,
                      }}
                    >
                      🏪{" "}
                      {
                        group.storeName
                      }
                    </div>
                  </div>

                  {/* 상품 */}

                  <div
                    style={{
                      padding:
                        "16px",
                    }}
                  >
                    {group.items.map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          key={`${getItemKey(
                            item
                          )}-${index}`}
                          style={{
                            marginBottom:
                              "20px",
                          }}
                        >
                          <h3
                            style={{
                              marginBottom:
                                "6px",
                            }}
                          >
                            {
                              item.productName
                            }
                          </h3>

                          <p
                            style={{
                              fontSize:
                                "12px",
                              color:
                                "#667085",
                            }}
                          >
                            JAN:{" "}
                            {
                              item.jan
                            }
                          </p>

                          <p>
                            일본 개당
                            가격:{" "}
                            <strong>
                              ¥
                              {item.japanPrice.toLocaleString()}
                            </strong>
                          </p>

                          <p>
                            소비세율:{" "}
                            <strong>
                              {Math.round(
                                item.taxRate *
                                  100
                              )}
                              %
                            </strong>
                          </p>

                          {/* 면세 상태 */}

                          {item.taxFreeEligible ? (
                            item.taxFreeAvailableAtStore ? (
                              <p
                                style={{
                                  color:
                                    "#047857",
                                  fontWeight:
                                    700,
                                }}
                              >
                                ✅ 이
                                매장에서
                                면세 적용
                                가능
                              </p>
                            ) : (
                              <p
                                style={{
                                  color:
                                    "#b45309",
                                  fontWeight:
                                    700,
                                }}
                              >
                                ⚠️ 상품은
                                면세
                                대상이지만
                                이 매장에서는
                                적용 안 함
                              </p>
                            )
                          ) : (
                            <p
                              style={{
                                color:
                                  "#b42318",
                                fontWeight:
                                  700,
                              }}
                            >
                              ⛔ 면세 제외
                              상품
                            </p>
                          )}

                          {/* 수량 */}

                          <div
                            style={{
                              display:
                                "flex",

                              alignItems:
                                "center",

                              gap:
                                "10px",

                              margin:
                                "12px 0",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                decreaseQuantity(
                                  item
                                )
                              }
                            >
                              -
                            </button>

                            <strong>
                              {
                                item.quantity
                              }
                              개
                            </strong>

                            <button
                              type="button"
                              onClick={() =>
                                increaseQuantity(
                                  item
                                )
                              }
                            >
                              +
                            </button>
                          </div>

                          <p>
                            일본 소계:{" "}
                            <strong>
                              ¥
                              {(
                                item.japanPrice *
                                item.quantity
                              ).toLocaleString()}
                            </strong>
                          </p>

                          <p>
                            한국 구매
                            예상: ₩
                            {(
                              item.koreaPrice *
                              item.quantity
                            ).toLocaleString()}
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              removeItem(
                                item
                              )
                            }
                          >
                            🗑️ 삭제
                          </button>

                          {index <
                            group
                              .items
                              .length -
                              1 && (
                            <hr
                              style={{
                                margin:
                                  "18px 0",
                              }}
                            />
                          )}
                        </div>
                      )
                    )}

                    {/* 매장별 면세 계산 */}

                    <div
                      style={{
                        marginTop:
                          "20px",

                        padding:
                          "16px",

                        borderRadius:
                          "12px",

                        background:
                          qualifies
                            ? "#ecfdf3"
                            : "#fff7ed",
                      }}
                    >
                      <h3
                        style={{
                          marginTop:
                            0,
                        }}
                      >
                        💴 이 매장
                        면세 환급
                        예상
                      </h3>

                      <p>
                        매장 결제
                        총액:{" "}
                        <strong>
                          ¥
                          {groupTotalYen.toLocaleString()}
                        </strong>
                      </p>

                      <p>
                        면세 가능 상품
                        세전 합계:{" "}
                        <strong>
                          ¥
                          {eligibleTaxExcludedTotal.toLocaleString()}
                        </strong>
                      </p>

                      {eligibleItems.length ===
                      0 ? (
                        <p
                          style={{
                            fontWeight:
                              700,
                          }}
                        >
                          ⚠️ 이 그룹에는
                          실제 면세
                          적용 가능한
                          상품이 없습니다.
                        </p>
                      ) : qualifies ? (
                        <>
                          <p
                            style={{
                              fontWeight:
                                700,
                              color:
                                "#047857",
                            }}
                          >
                            ✅ 세전
                            ¥5,000
                            이상으로
                            면세 최소금액
                            충족
                          </p>

                          <p>
                            예상 소비세
                            환급:{" "}
                            <strong>
                              ¥
                              {groupRefundYen.toLocaleString()}
                            </strong>
                          </p>

                          <p>
                            환급 후 이
                            매장 실구매가:{" "}
                            <strong>
                              ¥
                              {groupAfterRefund.toLocaleString()}
                            </strong>
                          </p>
                        </>
                      ) : (
                        <>
                          <p
                            style={{
                              fontWeight:
                                700,
                              color:
                                "#b45309",
                            }}
                          >
                            ⚠️ 세전
                            ¥5,000
                            기준 미달
                          </p>

                          <p>
                            세전 기준{" "}
                            <strong>
                              ¥
                              {remaining.toLocaleString()}
                            </strong>{" "}
                            부족합니다.
                          </p>
                        </>
                      )}

                      <small
                        style={{
                          color:
                            "#667085",
                          lineHeight:
                            1.5,
                        }}
                      >
                        ※ 같은 날짜,
                        같은 매장의
                        실제 면세 가능
                        상품만 합산합니다.
                      </small>
                    </div>
                  </div>
                </section>
              );
            }
          )}

          {/* 전체 요약 */}

          <div
            style={{
              marginTop:
                "24px",

              padding:
                "18px",

              border:
                "1px solid #d0d5dd",

              borderRadius:
                "16px",

              background:
                "#f8fafc",
            }}
          >
            <h3
              style={{
                marginTop:
                  0,
              }}
            >
              📊 전체 여행
              장바구니 요약
            </h3>

            <p>
              일본 현지 결제
              총액:{" "}
              <strong>
                ¥
                {totalJapanYen.toLocaleString()}
              </strong>
            </p>

            <p>
              예상 면세 환급
              총액:{" "}
              <strong>
                ¥
                {totalRefundYen.toLocaleString()}
              </strong>
            </p>

            <p>
              환급 후 일본
              실구매 총액:{" "}
              <strong>
                ¥
                {totalAfterRefundYen.toLocaleString()}
              </strong>
            </p>

            <hr />

            <p>
              환급 전 일본
              구매 예상:{" "}
              <strong>
                ₩
                {totalJapanPriceKrw.toLocaleString()}
              </strong>
            </p>

            <p>
              예상 환급액
              원화 환산:{" "}
              <strong>
                약 ₩
                {totalRefundKrw.toLocaleString()}
              </strong>
            </p>

            <p>
              환급 후 일본
              구매 예상:{" "}
              <strong>
                ₩
                {totalAfterRefundKrw.toLocaleString()}
              </strong>
            </p>

            <p>
              한국 구매 예상:{" "}
              <strong>
                ₩
                {totalKoreaPrice.toLocaleString()}
              </strong>
            </p>

            <hr />

            {totalSavingAfterRefund >
            0 ? (
              <div>
                <h3>
                  ✅ 일본 구매
                  추천
                </h3>

                <p>
                  면세 환급까지
                  적용하면 한국보다
                  약{" "}
                  <strong>
                    ₩
                    {totalSavingAfterRefund.toLocaleString()}
                  </strong>{" "}
                  절약 예상
                </p>
              </div>
            ) : totalSavingAfterRefund <
              0 ? (
              <div>
                <h3>
                  🇰🇷 한국 구매
                  추천
                </h3>

                <p>
                  면세 환급을
                  적용해도 한국에서
                  구매하는 것이 약{" "}
                  <strong>
                    ₩
                    {Math.abs(
                      totalSavingAfterRefund
                    ).toLocaleString()}
                  </strong>{" "}
                  저렴합니다.
                </p>
              </div>
            ) : (
              <p>
                🤔 면세 환급
                적용 후 한국과
                일본의 예상 구매
                가격이 같습니다.
              </p>
            )}

            <p
              style={{
                marginTop:
                  "16px",
                fontSize:
                  "12px",
                color:
                  "#667085",
                lineHeight:
                  1.6,
              }}
            >
              ※ 환급액은 예상
              금액입니다.
              <br />
              ※ 실제 환급은
              Tax-Free 매장,
              구매 조건 및 출국
              확인 결과에 따라
              달라질 수 있습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={
              clearCart
            }
            style={{
              marginTop:
                "20px",
            }}
          >
            장바구니 전체
            비우기
          </button>
        </>
      )}
    </div>
  );
}

export default Cart;