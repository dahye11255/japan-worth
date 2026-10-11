/*
 * JapanWorth 상품 자동 조회 API
 *
 * 1. Google Shopping Japan
 *    → JAN으로 일본 상품 식별
 *
 * 2. Google Korea
 *    → 같은 JAN이 실제로 확인되는
 *      한국 판매 페이지가 있으면
 *      한국어 상품명 획득
 *
 * 3. fallback
 *    → Open Facts
 *    → UPCitemdb
 */

function cleanText(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

/*
 * 일본 쇼핑몰 상품 제목 정리
 */
function cleanProductTitle(title) {
  let text = cleanText(title);

  if (!text) {
    return "";
  }

  // 【送料無料】 등 제거
  text = text.replace(
    /【[^】]*】/g,
    " "
  );

  // [送料無料] 등 제거
  text = text.replace(
    /\[[^\]]*\]/g,
    " "
  );

  // 제목 앞의 5個セット 등 제거
  text = text.replace(
    /^\s*\d+\s*(個|本|袋|箱)\s*(セット|パック)\s*[\/／]?\s*/gi,
    ""
  );

  // 중간의 5個パック 등 제거
  text = text.replace(
    /\d+\s*(個|本|袋|箱)\s*(セット|パック)/gi,
    " "
  );

  // 묶음구매 문구
  text = text.replace(
    /まとめ買い/gi,
    " "
  );

  // 배송 관련
  text = text.replace(
    /(メール便|送料無料|送料込|送料込み)/gi,
    " "
  );

  // /美容・健康>衛生日用品 같은 카테고리
  text = text.replace(
    /[\/／][^\/／]*>.*$/g,
    ""
  );

  // | 뒤 쇼핑몰 이름 등
  text = text.replace(
    /\|.*$/g,
    ""
  );

  return text
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * fallback용 검색어
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
 * 너무 일반적인 상품명 제외
 */
function isGenericProductName(name) {
  const normalized =
    cleanText(name)
      .toLowerCase();

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
 * Open Facts 이상한 카테고리 제거
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
 * 한국 검색 결과 제목 정리
 */
function cleanKoreanTitle(title) {
  let text =
    cleanText(title);

  if (!text) {
    return "";
  }

  // [공식몰], [쿠팡] 등
  text = text.replace(
    /\[[^\]]*\]/g,
    " "
  );

  // 끝에 쇼핑몰명 제거
  text = text.replace(
    /\s*[-–—|:]\s*(쿠팡!?|네이버.*|G마켓.*|옥션.*|11번가.*|롯데ON.*|SSG.*)$/i,
    ""
  );

  text = text.replace(
    /\s+/g,
    " "
  );

  return text.trim();
}

/*
 * 문자열 안에 정확한 JAN이 있는지
 */
function containsJan(
  text,
  jan
) {
  return cleanText(text)
    .replace(/\s/g, "")
    .includes(jan);
}

/*
 * 한국 검색결과 검증
 *
 * 중요:
 * 단순히 한글 제목이라는 이유만으로
 * 절대 채택하지 않는다.
 *
 * 제목 또는 snippet 안에
 * 동일한 JAN이 있어야 한다.
 */
function scoreVerifiedKoreanResult(
  result,
  jan
) {
  const title =
    cleanText(
      result?.title
    );

  const snippet =
    cleanText(
      result?.snippet
    );

  if (!title) {
    return -9999;
  }

  /*
   * 한글 제목 필수
   */
  if (
    !/[가-힣]/.test(title)
  ) {
    return -9999;
  }

  /*
   * 핵심:
   * JAN이 검색결과에 실제로 있어야 함
   */
  const janVerified =
    containsJan(
      title,
      jan
    ) ||
    containsJan(
      snippet,
      jan
    );

  if (!janVerified) {
    return -9999;
  }

  let score = 100;

  const link =
    cleanText(
      result?.link
    )
      .toLowerCase();

  /*
   * 한국 쇼핑몰이면 가점
   */
  if (
    /coupang|naver|smartstore|gmarket|auction|11st|lotte|ssg/.test(
      link
    )
  ) {
    score += 30;
  }

  /*
   * JAN이 제목에 직접 있으면 더 확실
   */
  if (
    containsJan(
      title,
      jan
    )
  ) {
    score += 20;
  }

  /*
   * 바코드 조회 사이트는 감점
   */
  if (
    /(바코드|barcode|상품코드|ean|jan 코드)/i.test(
      title
    )
  ) {
    score -= 40;
  }

  if (
    title.length > 120
  ) {
    score -= 15;
  }

  return score;
}

/*
 * 같은 JAN을 한국 Google에서 검색해서
 * 실제 한국 상품명 찾기
 */
async function findKoreanSearchKeyword(
  jan,
  fallbackName
) {
  const fallback =
    cleanProductTitle(
      fallbackName
    );

  /*
   * 원래 상품명이 이미 한글이면
   * 추가 호출 불필요
   */
  if (
    /[가-힣]/.test(
      fallback
    )
  ) {
    return fallback;
  }

  const apiKey =
    process.env
      .SERPAPI_API_KEY;

  if (!apiKey) {
    return fallback;
  }

  try {
    /*
     * 따옴표로 JAN 정확검색
     */
    const params =
      new URLSearchParams({
        engine:
          "google",

        q:
          `"${jan}"`,

        gl:
          "kr",

        hl:
          "ko",

        api_key:
          apiKey,
      });

    const response =
      await fetch(
        `https://serpapi.com/search.json?${params.toString()}`
      );

    if (!response.ok) {
      return fallback;
    }

    const data =
      await response.json();

    if (data.error) {
      console.error(
        "한국 Google 검색 오류:",
        data.error
      );

      return fallback;
    }

    const results =
      Array.isArray(
        data.organic_results
      )
        ? data.organic_results
        : [];

    if (
      results.length === 0
    ) {
      return fallback;
    }

    /*
     * JAN 검증 통과한 결과만 남김
     */
    const verifiedResults =
      results
        .map((result) => ({
          result,

          score:
            scoreVerifiedKoreanResult(
              result,
              jan
            ),
        }))
        .filter(
          (item) =>
            item.score >= 0
        )
        .sort(
          (a, b) =>
            b.score -
            a.score
        );

    /*
     * 정확한 결과가 없으면
     * 엉뚱한 한글 검색어를 만들지 않는다.
     */
    if (
      verifiedResults.length ===
      0
    ) {
      console.log(
        "한국 JAN 검색결과 없음:",
        jan
      );

      return fallback;
    }

    const keyword =
      cleanKoreanTitle(
        verifiedResults[0]
          .result
          .title
      );

    if (
      !keyword ||
      keyword.length > 120
    ) {
      return fallback;
    }

    console.log(
      "한국 상품명 발견:",
      keyword
    );

    return keyword;
  } catch (error) {
    console.error(
      "한국 상품명 검색 오류:",
      error
    );

    return fallback;
  }
}

/*
 * 일본 Google Shopping 결과 순위
 *
 * 세트상품보다 단품 우선
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

  if (
    /\d+\s*(個|本|袋|箱)\s*(セット|パック)/i.test(
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

  if (
    title.includes(">")
  ) {
    score += 10;
  }

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
    process.env
      .SERPAPI_API_KEY;

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

        q:
          jan,

        gl:
          "jp",

        hl:
          "ja",

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
     * 단품에 가까운 결과 우선
     */
    const sortedResults =
      [...results]
        .sort(
          (a, b) =>
            scoreShoppingResult(
              a
            ) -
            scoreShoppingResult(
              b
            )
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

    /*
     * 같은 JAN으로
     * 한국 상품명 탐색
     */
    const koreanSearchKeyword =
      await findKoreanSearchKeyword(
        jan,
        name
      );

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

      brand:
        "",

      category:
        "",

      imageUrl,

      quantity:
        "",

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
       * 한국 가격 검색용
       */
      searchKeyword:
        koreanSearchKeyword,
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
      response.status === 404
    ) {
      return null;
    }

    if (!response.ok) {
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

    if (
      isGenericProductName(
        name
      ) &&
      !brand
    ) {
      return null;
    }

    const fallbackKeyword =
      buildSearchKeyword(
        name,
        brand
      );

    const koreanSearchKeyword =
      await findKoreanSearchKeyword(
        jan,
        fallbackKeyword
      );

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

      seller:
        "",

      source:
        "Open Facts",

      sourceUrl:
        "",

      searchKeyword:
        koreanSearchKeyword,
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
      response.status === 429 ||
      response.status === 404
    ) {
      return null;
    }

    if (!response.ok) {
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
      cleanProductTitle(
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

    const fallbackKeyword =
      buildSearchKeyword(
        name,
        brand
      );

    const koreanSearchKeyword =
      await findKoreanSearchKeyword(
        jan,
        fallbackKeyword
      );

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

      seller:
        "",

      source:
        "UPCitemdb",

      sourceUrl:
        "",

      searchKeyword:
        koreanSearchKeyword,
    };
  } catch (error) {
    console.error(
      "UPCitemdb 조회 오류:",
      error
    );

    return null;
  }
}

/*
 * API handler
 */
export default async function handler(
  req,
  res
) {
  if (
    req.method !== "GET"
  ) {
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
   * 개발 중에는 캐시 X
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