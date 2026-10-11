/*
 * JapanWorth 상품 자동 조회 API
 *
 * 흐름
 *
 * JAN
 * ↓
 * Google Shopping Japan
 * → 상품명 / 사진 식별
 *
 * ↓
 * 같은 JAN을 Google Korea 일반검색
 * → 한국에서 실제로 쓰는 상품명 탐색
 *
 * ↓
 * searchKeyword로 반환
 *
 * fallback:
 * Open Facts → UPCitemdb
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

  // 【メール便】, 【送料無料】 등 제거
  text = text.replace(
    /【[^】]*】/g,
    " "
  );

  // [送料無料] 형태 제거
  text = text.replace(
    /\[[^\]]*\]/g,
    " "
  );

  // 제목 앞 5個セット / 3個パック 제거
  text = text.replace(
    /^\s*\d+\s*(個|本|袋|箱)\s*(セット|パック)\s*[\/／]?\s*/gi,
    ""
  );

  // 제목 중간/뒤 5個パック 등 제거
  text = text.replace(
    /\d+\s*(個|本|袋|箱)\s*(セット|パック)/gi,
    " "
  );

  // まとめ買い 제거
  text = text.replace(
    /まとめ買い/gi,
    " "
  );

  // 배송 관련 문구 제거
  text = text.replace(
    /(メール便|送料無料|送料込|送料込み)/gi,
    " "
  );

  // /美容・健康>衛生日用品 같은 카테고리 제거
  text = text.replace(
    /[\/／][^\/／]*>.*$/g,
    ""
  );

  // | 뒤 쇼핑몰 문구 제거
  text = text.replace(
    /\|.*$/g,
    ""
  );

  text = text
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

/*
 * fallback 검색어 생성
 *
 * JAN은 넣지 않는다.
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

  // [쿠팡], [공식몰] 등 제거
  text = text.replace(
    /\[[^\]]*\]/g,
    " "
  );

  // 끝에 붙는 쇼핑몰 이름 제거
  text = text.replace(
    /\s*[-–—|:]\s*(쿠팡!?|네이버.*|G마켓.*|옥션.*|11번가.*|롯데ON.*|SSG.*)$/i,
    ""
  );

  // "쿠팡!" 단독 꼬리 제거
  text = text.replace(
    /\s*[-–—|]\s*쿠팡!?\s*$/i,
    ""
  );

  text = text
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

/*
 * 한국 Google 검색 결과 점수
 */
function scoreKoreanResult(
  result,
  jan
) {
  const title =
    cleanText(
      result?.title
    );

  if (!title) {
    return -9999;
  }

  /*
   * 한글이 없는 결과는 제외
   */
  if (
    !/[가-힣]/.test(title)
  ) {
    return -9999;
  }

  let score = 0;

  /*
   * 한글이 많이 포함될수록 가점
   */
  const koreanChars =
    title.match(
      /[가-힣]/g
    ) ?? [];

  score +=
    koreanChars.length;

  /*
   * JAN이 제목에도 있으면
   * 동일 상품일 가능성 높음
   */
  if (
    title.includes(jan)
  ) {
    score += 20;
  }

  const link =
    cleanText(
      result?.link
    ).toLowerCase();

  /*
   * 한국 쇼핑몰 결과 가점
   */
  if (
    /coupang|naver|gmarket|auction|11st|lotte|ssg|shopping/.test(
      link
    )
  ) {
    score += 15;
  }

  /*
   * 바코드 DB 사이트 같은 결과는 감점
   */
  if (
    /(바코드|barcode|ean|jan 코드|상품정보조회)/i.test(
      title
    )
  ) {
    score -= 15;
  }

  if (
    title.length > 120
  ) {
    score -= 10;
  }

  return score;
}

/*
 * 같은 JAN으로 한국 웹 검색
 *
 * 일본어 상품명이 아니라
 * 실제 한국 판매자가 사용하는
 * 한국어 상품명을 얻기 위한 단계
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
   * 이미 한글이면
   * 추가 API 요청하지 않음
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
    const params =
      new URLSearchParams({
        engine:
          "google",

        q: jan,

        gl: "kr",

        hl: "ko",

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
     * 한국어 결과 중
     * 가장 점수가 높은 결과 선택
     */
    const ranked =
      results
        .map((result) => ({
          result,
          score:
            scoreKoreanResult(
              result,
              jan
            ),
        }))
        .filter(
          (item) =>
            item.score > -9999
        )
        .sort(
          (a, b) =>
            b.score -
            a.score
        );

    if (
      ranked.length === 0
    ) {
      return fallback;
    }

    const keyword =
      cleanKoreanTitle(
        ranked[0]
          .result
          .title
      );

    if (!keyword) {
      return fallback;
    }

    /*
     * 지나치게 긴 검색어는
     * 한국 쇼핑 검색에 방해가 됨
     */
    if (
      keyword.length > 100
    ) {
      return fallback;
    }

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
 * 일본 Google Shopping 검색 결과 점수
 *
 * 여러 개 세트보다는
 * 단품 결과를 우선한다.
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
     * 세트상품을 뒤로 보내기
     */
    const sortedResults =
      [...results].sort(
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
     * 여기서 같은 JAN을
     * 한국 Google에 검색
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

      /*
       * 화면에는 일본에서 찾은
       * 정확한 상품명 표시
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
       * 한국 가격검색에는
       * 한국 Google에서 찾은
       * 한국어 이름 사용
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

      seller: "",

      source:
        "Open Facts",

      sourceUrl: "",

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

      seller: "",

      source:
        "UPCitemdb",

      sourceUrl: "",

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
   * 지금은 개발 중이므로
   * 예전 검색어가 캐시에 남지 않게 한다.
   */
  res.setHeader(
    "Cache-Control",
    "no-store"
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