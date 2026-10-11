/*
 * JapanWorth 상품 자동 조회 API
 *
 * 조회 순서
 *
 * 1. Google Shopping Japan (SerpApi)
 * 2. Open Facts
 * 3. UPCitemdb
 *
 * GET
 * /api/product?jan=4987241105052
 */

function cleanText(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function buildSearchKeyword(
  jan,
  name,
  brand = ""
) {
  return [
    brand,
    name,
    jan,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

/*
 * "Lip Balm", "Shampoo"처럼
 * 너무 일반적인 상품명인지 확인
 */
function isGenericProductName(name) {
  const normalized =
    cleanText(name).toLowerCase();

  const genericNames = [
    "lip balm",
    "lipbalm",
    "shampoo",
    "conditioner",
    "hair oil",
    "eye drops",
    "eye drop",
    "cosmetic",
    "cosmetics",
    "product",
    "beauty product",
  ];

  return genericNames.includes(
    normalized
  );
}

/*
 * Open Facts 카테고리에서
 * 이상한 문구 제거
 */
function cleanCategory(category) {
  const value =
    cleanText(category);

  if (!value) {
    return "";
  }

  if (
    value
      .toLowerCase()
      .includes(
        "incorrect product type"
      )
  ) {
    return "";
  }

  return value;
}

/*
 * 1.
 * Google Shopping Japan
 *
 * 이미 JapanWorth에서 사용하는
 * SERPAPI_API_KEY 재사용
 */
async function searchGoogleShoppingJapan(
  jan
) {
  const apiKey =
    process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    console.error(
      "SERPAPI_API_KEY가 없습니다."
    );

    return null;
  }

  try {
    const params =
      new URLSearchParams({
        engine:
          "google_shopping",

        q: jan,

        gl: "jp",

        hl: "ja",

        google_domain:
          "google.co.jp",

        api_key: apiKey,
      });

    const response =
      await fetch(
        `https://serpapi.com/search.json?${params.toString()}`
      );

    if (!response.ok) {
      console.error(
        "Google Shopping Japan 오류:",
        response.status
      );

      return null;
    }

    const data =
      await response.json();

    if (data.error) {
      console.error(
        "SerpApi 오류:",
        data.error
      );

      return null;
    }

    const results =
      Array.isArray(
        data.shopping_results
      )
        ? data.shopping_results
        : [];

    /*
     * 상품명이 정상적으로 있는
     * 첫 결과 사용
     */
    const item =
      results.find(
        (result) =>
          cleanText(
            result?.title
          ).length >= 3
      );

    if (!item) {
      return null;
    }

    const name =
      cleanText(item.title);

    const imageUrl =
      cleanText(
        item.thumbnail
      ) ||
      cleanText(
        item.serpapi_thumbnail
      );

    return {
      jan,

      name,

      /*
       * Google Shopping의 source는
       * 브랜드가 아니라 판매처일 수 있으므로
       * brand에 억지로 넣지 않음
       */
      brand: "",

      category: "",

      imageUrl,

      quantity: "",

      productQuantity: null,

      seller:
        cleanText(item.source),

      source:
        "Google Shopping Japan",

      sourceUrl:
        cleanText(
          item.product_link
        ) ||
        cleanText(item.link),

      searchKeyword:
        buildSearchKeyword(
          jan,
          name
        ),
    };
  } catch (error) {
    console.error(
      "Google Shopping Japan 조회 오류:",
      error
    );

    return null;
  }
}

/*
 * 2.
 * Open Facts
 *
 * Food / Beauty / Products
 * 통합 조회
 */
async function searchOpenFacts(
  jan
) {
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
      `&fields=${encodeURIComponent(
        fields
      )}`;

    const response =
      await fetch(url, {
        headers: {
          Accept:
            "application/json",

          "User-Agent":
            "JapanWorth/1.0 (https://japan-worth.vercel.app)",
        },
      });

    if (
      response.status === 404
    ) {
      return null;
    }

    if (!response.ok) {
      console.error(
        "Open Facts 오류:",
        response.status
      );

      return null;
    }

    const data =
      await response.json();

    if (
      data.status !== 1 ||
      !data.product
    ) {
      return null;
    }

    const item =
      data.product;

    const name =
      cleanText(
        item.product_name_ja
      ) ||
      cleanText(
        item.product_name
      ) ||
      cleanText(
        item.product_name_en
      );

    const brand =
      cleanText(
        item.brands
      );

    if (!name) {
      return null;
    }

    /*
     * 예:
     * 상품명 = Lip Balm
     * 브랜드 = 없음
     *
     * 이런 데이터는 잘못된 한국 상품을
     * 검색하게 만들기 때문에 버림
     */
    if (
      isGenericProductName(
        name
      ) &&
      !brand
    ) {
      console.log(
        "Open Facts 상품명이 너무 일반적이라 제외:",
        name
      );

      return null;
    }

    return {
      jan,

      name,

      brand,

      category:
        cleanCategory(
          item.categories
        ),

      imageUrl:
        cleanText(
          item.image_front_url
        ) ||
        cleanText(
          item.image_url
        ),

      quantity:
        cleanText(
          item.quantity
        ),

      productQuantity:
        item.product_quantity ??
        null,

      seller: "",

      source:
        "Open Facts",

      sourceUrl: "",

      searchKeyword:
        buildSearchKeyword(
          jan,
          name,
          brand
        ),
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
 * 3.
 * UPCitemdb fallback
 */
async function searchUpcItemDb(
  jan
) {
  try {
    const url =
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(
        jan
      )}`;

    const response =
      await fetch(url, {
        headers: {
          Accept:
            "application/json",
        },
      });

    if (
      response.status === 429
    ) {
      console.error(
        "UPCitemdb 조회 제한 초과"
      );

      return null;
    }

    if (
      response.status === 404
    ) {
      return null;
    }

    if (!response.ok) {
      console.error(
        "UPCitemdb 오류:",
        response.status
      );

      return null;
    }

    const data =
      await response.json();

    const items =
      Array.isArray(
        data.items
      )
        ? data.items
        : [];

    if (
      items.length === 0
    ) {
      return null;
    }

    const item =
      items[0];

    const name =
      cleanText(
        item.title
      );

    const brand =
      cleanText(
        item.brand
      );

    if (!name) {
      return null;
    }

    if (
      isGenericProductName(
        name
      ) &&
      !brand
    ) {
      return null;
    }

    let imageUrl = "";

    if (
      Array.isArray(
        item.images
      ) &&
      item.images.length > 0
    ) {
      imageUrl =
        cleanText(
          item.images[0]
        );
    }

    return {
      jan,

      name,

      brand,

      category:
        cleanText(
          item.category
        ),

      imageUrl,

      quantity:
        cleanText(
          item.weight
        ),

      productQuantity:
        null,

      seller: "",

      source:
        "UPCitemdb",

      sourceUrl: "",

      searchKeyword:
        buildSearchKeyword(
          jan,
          name,
          brand
        ),
    };
  } catch (error) {
    console.error(
      "UPCitemdb 조회 오류:",
      error
    );

    return null;
  }
}

export default async function handler(
  req,
  res
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error:
        "GET 요청만 가능합니다.",
    });
  }

  const jan =
    typeof req.query?.jan ===
    "string"
      ? req.query.jan.trim()
      : "";

  if (!jan) {
    return res.status(400).json({
      error:
        "JAN / EAN 코드가 필요합니다.",
    });
  }

  if (
    !/^\d{8,14}$/.test(jan)
  ) {
    return res.status(400).json({
      error:
        "올바른 JAN / EAN 코드를 입력해주세요.",
    });
  }

  /*
   * 같은 JAN 반복 조회 시
   * SerpApi 호출 낭비 감소
   */
  res.setHeader(
    "Cache-Control",
    "s-maxage=86400, stale-while-revalidate=604800"
  );

  try {
    /*
     * 1순위
     * 일본 Google Shopping
     */
    const googleProduct =
      await searchGoogleShoppingJapan(
        jan
      );

    if (googleProduct) {
      return res
        .status(200)
        .json({
          found: true,
          product:
            googleProduct,
        });
    }

    /*
     * 2순위
     * Open Facts
     */
    const openFactsProduct =
      await searchOpenFacts(
        jan
      );

    if (
      openFactsProduct
    ) {
      return res
        .status(200)
        .json({
          found: true,
          product:
            openFactsProduct,
        });
    }

    /*
     * 3순위
     * UPCitemdb
     */
    const upcProduct =
      await searchUpcItemDb(
        jan
      );

    if (upcProduct) {
      return res
        .status(200)
        .json({
          found: true,
          product:
            upcProduct,
        });
    }

    return res
      .status(200)
      .json({
        found: false,
        jan,
      });
  } catch (error) {
    console.error(
      "상품 정보 조회 오류:",
      error
    );

    return res
      .status(500)
      .json({
        error:
          "상품 정보 조회 중 오류가 발생했습니다.",

        detail:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류",
      });
  }
}