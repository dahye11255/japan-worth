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

/*
 * 일본 쇼핑몰 제목 정리
 *
 * 예:
 *
 * 5個セット/【メール便】ロート製薬
 * メンソレータム 薬用リップスティックXD
 * 5個パック/美容・健康>衛生日用品
 *
 * ↓
 *
 * ロート製薬 メンソレータム 薬用リップスティックXD
 */
function cleanProductTitle(title) {
  let text = cleanText(title);

  if (!text) {
    return "";
  }

  /*
   * 【メール便】
   * 【送料無料】
   * 【第3類医薬品】
   * 같은 괄호 문구 제거
   */
  text = text.replace(
    /【[^】]*】/g,
    " "
  );

  /*
   * [送料無料] 형태 제거
   */
  text = text.replace(
    /\[[^\]]*\]/g,
    " "
  );

  /*
   * 제목 맨 앞
   * 5個セット/
   * 3個セット
   * 제거
   */
  text = text.replace(
    /^\s*\d+\s*個\s*(セット|パック)\s*[\/／]?\s*/gi,
    ""
  );

  /*
   * 중간/뒤쪽
   * 5個パック
   * 3個セット
   * 2本セット
   */
  text = text.replace(
    /\d+\s*(個|本|袋|箱)\s*(セット|パック)/gi,
    " "
  );

  /*
   * まとめ買い
   */
  text = text.replace(
    /まとめ買い/gi,
    " "
  );

  /*
   * メール便
   * 送料無料
   * 送料込
   */
  text = text.replace(
    /(メール便|送料無料|送料込|送料込み)/gi,
    " "
  );

  /*
   * 뒤에 붙은 쇼핑몰 카테고리
   *
   * /美容・健康>衛生日用品
   */
  text = text.replace(
    /[\/／][^\/／]*>.*$/g,
    ""
  );

  /*
   * | 이후 광고/카테고리 문구 제거
   */
  text = text.replace(
    /\|.*$/g,
    ""
  );

  /*
   * 불필요한 슬래시 정리
   */
  text = text.replace(
    /^[\/／]+|[\/／]+$/g,
    " "
  );

  /*
   * 공백 정리
   */
  text = text
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

/*
 * 한국 판매가 검색용 키워드
 *
 * JAN은 넣지 않음.
 * 일본 쇼핑몰 광고 문구도 넣지 않음.
 */
function buildSearchKeyword(
  name,
  brand = ""
) {
  const cleanName =
    cleanProductTitle(name);

  const cleanBrand =
    cleanText(brand);

  if (!cleanName) {
    return "";
  }

  /*
   * 상품명에 브랜드가 이미 들어있으면
   * 브랜드 중복 추가하지 않음
   */
  if (
    cleanBrand &&
    !cleanName
      .toLowerCase()
      .includes(
        cleanBrand.toLowerCase()
      )
  ) {
    return `${cleanBrand} ${cleanName}`.trim();
  }

  return cleanName;
}

/*
 * "Lip Balm"
 * "Shampoo"
 * 같이 너무 일반적인 상품명인지 확인
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
 * Open Facts 카테고리 이상한 문구 제거
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
 * Google Shopping 결과 중
 * 단품에 가까운 결과 우선 선택
 */
function scoreShoppingResult(
  result
) {
  const title =
    cleanText(
      result?.title
    );

  if (!title) {
    return 9999;
  }

  let score = 0;

  /*
   * 여러 개 묶음 상품은 뒤로
   */
  if (
    /\d+\s*個\s*(セット|パック)/i.test(
      title
    )
  ) {
    score += 50;
  }

  if (
    /\d+\s*(本|袋|箱)\s*(セット|パック)/i.test(
      title
    )
  ) {
    score += 50;
  }

  if (
    /まとめ買い/i.test(
      title
    )
  ) {
    score += 40;
  }

  /*
   * 쇼핑몰 카테고리까지 붙은 결과
   */
  if (
    title.includes(">")
  ) {
    score += 10;
  }

  /*
   * 너무 긴 제목
   */
  if (
    title.length > 80
  ) {
    score += 10;
  }

  return score;
}

/*
 * 1.
 * Google Shopping Japan
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

        api_key:
          apiKey,
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

    if (
      results.length === 0
    ) {
      return null;
    }

    /*
     * 세트상품보다는
     * 단품에 가까운 결과 우선
     */
    const sortedResults =
      [...results].sort(
        (a, b) =>
          scoreShoppingResult(a) -
          scoreShoppingResult(b)
      );

    const item =
      sortedResults.find(
        (result) =>
          cleanText(
            result?.title
          ).length >= 3
      );

    if (!item) {
      return null;
    }

    const rawName =
      cleanText(
        item.title
      );

    const name =
      cleanProductTitle(
        rawName
      );

    if (!name) {
      return null;
    }

    const imageUrl =
      cleanText(
        item.thumbnail
      ) ||
      cleanText(
        item.serpapi_thumbnail
      );

    return {
      jan,

      /*
       * 화면에도 정제된 상품명 표시
       */
      name,

      brand: "",

      category: "",

      imageUrl,

      quantity: "",

      productQuantity:
        null,

      seller:
        cleanText(
          item.source
        ),

      source:
        "Google Shopping Japan",

      sourceUrl:
        cleanText(
          item.product_link
        ) ||
        cleanText(
          item.link
        ),

      /*
       * 한국 검색에는
       * 깨끗한 상품명만 사용
       */
      searchKeyword:
        buildSearchKeyword(
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
      await fetch(
        url,
        {
          headers: {
            Accept:
              "application/json",

            "User-Agent":
              "JapanWorth/1.0 (https://japan-worth.vercel.app)",
          },
        }
      );

    if (
      response.status ===
      404
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

    const rawName =
      cleanText(
        item.product_name_ja
      ) ||
      cleanText(
        item.product_name
      ) ||
      cleanText(
        item.product_name_en
      );

    const name =
      cleanProductTitle(
        rawName
      );

    const brand =
      cleanText(
        item.brands
      );

    if (!name) {
      return null;
    }

    /*
     * Lip Balm처럼
     * 일반적인 이름만 있는 경우 제외
     */
    if (
      isGenericProductName(
        name
      ) &&
      !brand
    ) {
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
 * UPCitemdb
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
      await fetch(
        url,
        {
          headers: {
            Accept:
              "application/json",
          },
        }
      );

    if (
      response.status ===
      429
    ) {
      console.error(
        "UPCitemdb 조회 제한 초과"
      );

      return null;
    }

    if (
      response.status ===
      404
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

    const rawName =
      cleanText(
        item.title
      );

    const name =
      cleanProductTitle(
        rawName
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
    return res
      .status(405)
      .json({
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
    return res
      .status(400)
      .json({
        error:
          "JAN / EAN 코드가 필요합니다.",
      });
  }

  if (
    !/^\d{8,14}$/.test(
      jan
    )
  ) {
    return res
      .status(400)
      .json({
        error:
          "올바른 JAN / EAN 코드를 입력해주세요.",
      });
  }

  /*
   * 개발 중에는 캐시 끄기.
   *
   * 안 그러면 같은 JAN 테스트 시
   * 예전 검색어가 계속 보일 수 있음.
   */
  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  try {
    /*
     * 1순위
     * Google Shopping Japan
     */
    const googleProduct =
      await searchGoogleShoppingJapan(
        jan
      );

    if (
      googleProduct
    ) {
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

    if (
      upcProduct
    ) {
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