export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "GET 요청만 가능합니다.",
    });
  }

  const jan =
    typeof req.query?.jan === "string"
      ? req.query.jan.trim()
      : "";

  if (!jan) {
    return res.status(400).json({
      error: "JAN / EAN 코드가 필요합니다.",
    });
  }

  if (!/^\d{8,14}$/.test(jan)) {
    return res.status(400).json({
      error: "올바른 JAN / EAN 코드를 입력해주세요.",
    });
  }

  /*
   * 1. Open Facts 통합 조회
   *
   * food / beauty / product 등을
   * product_type=all 로 한 번에 검색
   */
  async function searchOpenFacts() {
    try {
      const fields = [
        "code",
        "product_name",
        "product_name_ja",
        "product_name_en",
        "brands",
        "categories",
        "image_front_url",
        "image_url",
        "quantity",
        "product_quantity",
      ].join(",");

      const url =
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
          jan
        )}` +
        `?product_type=all` +
        `&fields=${encodeURIComponent(fields)}`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",

          /*
           * Open Facts에서 권장하는
           * 앱 식별용 User-Agent
           */
          "User-Agent":
            "JapanWorth/1.0 (https://japan-worth.vercel.app)",
        },
      });

      /*
       * 없는 상품이면 다음 DB로
       */
      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        console.error(
          "Open Facts 오류:",
          response.status
        );

        return null;
      }

      const data = await response.json();

      /*
       * v2 API에서는 status === 1일 때
       * 상품이 존재
       */
      if (
        data.status !== 1 ||
        !data.product
      ) {
        return null;
      }

      const item = data.product;

      const name =
        item.product_name_ja ||
        item.product_name ||
        item.product_name_en ||
        "";

      /*
       * 상품명이 아예 없으면
       * 사용하기 어려우므로 fallback
       */
      if (!name) {
        return null;
      }

      return {
        jan,

        name,

        brand:
          item.brands ?? "",

        category:
          item.categories ?? "",

        imageUrl:
          item.image_front_url ??
          item.image_url ??
          "",

        quantity:
          item.quantity ?? "",

        productQuantity:
          item.product_quantity ?? null,

        description: "",

        source:
          "Open Facts",
      };
    } catch (error) {
      console.error(
        "Open Facts 조회 오류:",
        error
      );

      return null;
    }
  }

  /*
   * 2. UPCitemdb fallback
   */
  async function searchUpcItemDb() {
    try {
      const url =
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(
          jan
        )}`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      /*
       * API 제한
       */
      if (response.status === 429) {
        console.error(
          "UPCitemdb 조회 제한 초과"
        );

        return null;
      }

      /*
       * 상품 없음
       */
      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        console.error(
          "UPCitemdb 오류:",
          response.status
        );

        return null;
      }

      const data = await response.json();

      const items =
        Array.isArray(data.items)
          ? data.items
          : [];

      if (items.length === 0) {
        return null;
      }

      const item = items[0];

      if (!item.title) {
        return null;
      }

      return {
        jan,

        name:
          item.title ?? "",

        brand:
          item.brand ?? "",

        category:
          item.category ?? "",

        description:
          item.description ?? "",

        imageUrl:
          Array.isArray(item.images) &&
          item.images.length > 0
            ? item.images[0]
            : "",

        quantity:
          item.weight ?? "",

        productQuantity:
          null,

        source:
          "UPCitemdb",
      };
    } catch (error) {
      console.error(
        "UPCitemdb 조회 오류:",
        error
      );

      return null;
    }
  }

  try {
    /*
     * 1순위
     * Open Food / Beauty / Products Facts
     */
    const openFactsProduct =
      await searchOpenFacts();

    if (openFactsProduct) {
      return res.status(200).json({
        found: true,

        product:
          openFactsProduct,
      });
    }

    /*
     * 2순위
     * UPCitemdb
     */
    const upcProduct =
      await searchUpcItemDb();

    if (upcProduct) {
      return res.status(200).json({
        found: true,

        product:
          upcProduct,
      });
    }

    /*
     * 어디에서도 못 찾음
     */
    return res.status(200).json({
      found: false,
      jan,
    });
  } catch (error) {
    console.error(
      "상품 정보 조회 오류:",
      error
    );

    return res.status(500).json({
      error:
        "상품 정보 조회 중 오류가 발생했습니다.",

      detail:
        error instanceof Error
          ? error.message
          : "알 수 없는 오류",
    });
  }
}