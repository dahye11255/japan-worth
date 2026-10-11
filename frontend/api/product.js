/*
 * JapanWorth 상품 자동 조회 API
 *
 * 최종 흐름
 *
 * JAN / EAN
 * ↓
 * 1. Google Shopping Japan
 * ↓ 실패
 * 2. Open Facts
 * ↓ 실패
 * 3. UPCitemdb
 *
 * 상품을 찾았으면
 * ↓
 * Google Cloud Translation
 * 원문 → 한국어
 *
 * ↓
 * 한국어 상품명을 searchKeyword로 반환
 *
 * PriceComparison에서는
 * Google Shopping → 네이버/쿠팡 fallback
 */

function cleanText(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

/*
 * 일본 상품명인지 확인
 */
function hasJapanese(text) {
  return /[ぁ-んァ-ヶ一-龯]/.test(
    cleanText(text)
  );
}

/*
 * HTML entity 디코딩
 *
 * Google Translation 응답에서
 * &amp; 같은 문자가 들어오는 경우 대비
 */
function decodeHtmlEntities(text) {
  return cleanText(text)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(
      /&#(\d+);/g,
      (_, code) =>
        String.fromCharCode(
          Number(code)
        )
    )
    .replace(
      /&#x([0-9a-f]+);/gi,
      (_, code) =>
        String.fromCharCode(
          parseInt(code, 16)
        )
    );
}

/*
 * 일본 쇼핑몰 상품 제목 정리
 *
 * 예:
 *
 * お値下げ
 * 5個セット/
 * 【メール便】
 * 商品名
 * /美容・健康>...
 *
 * ↓
 *
 * 商品名
 */
function cleanProductTitle(title) {
  let text =
    cleanText(title);

  if (!text) {
    return "";
  }

  /*
   * 판매자가 붙인 가격/할인 문구
   */
  text = text.replace(
    /^(お値下げ|値下げ|価格改定|SALE|セール)\s*/gi,
    ""
  );

  /*
   * 【送料無料】
   * 【メール便】
   */
  text = text.replace(
    /【[^】]*】/g,
    " "
  );

  /*
   * [送料無料]
   */
  text = text.replace(
    /\[[^\]]*\]/g,
    " "
  );

  /*
   * 제목 앞
   *
   * 5個セット/
   * 3本パック/
   */
  text = text.replace(
    /^\s*\d+\s*(個|本|袋|箱)\s*(セット|パック)\s*[\/／]?\s*/gi,
    ""
  );

  /*
   * 제목 중간/뒤
   *
   * 5個パック
   * 3本セット
   */
  text = text.replace(
    /\d+\s*(個|本|袋|箱)\s*(セット|パック)/gi,
    " "
  );

  /*
   * 쇼핑몰용 문구
   */
  text = text.replace(
    /(まとめ買い|メール便|送料無料|送料込|送料込み)/gi,
    " "
  );

  /*
   * 뒤에 붙은 카테고리
   *
   * /美容・健康>衛生日用品
   */
  text = text.replace(
    /[\/／][^\/／]*>.*$/g,
    ""
  );

  /*
   * | 쇼핑몰 이름
   */
  text = text.replace(
    /\|.*$/g,
    ""
  );

  return text
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * Open Facts에서
 * 이상한 카테고리 제거
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
 * 너무 일반적인 상품명
 *
 * 이런 데이터만 있으면
 * 한국 쇼핑 검색 정확도가 너무 낮음
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
 * =================================
 * 실제 번역
 * =================================
 *
 * Google Cloud Translation
 *
 * 일본어 / 영어 등
 * ↓
 * 한국어
 */
async function translateToKorean(
  originalText
) {
  const original =
    cleanProductTitle(
      originalText
    );

  if (!original) {
    return {
      text: "",
      translated: false,
    };
  }

  /*
   * 이미 한글이면 번역 필요 없음
   */
  if (
    /[가-힣]/.test(
      original
    ) &&
    !hasJapanese(
      original
    )
  ) {
    return {
      text: original,
      translated: false,
    };
  }

  const apiKey =
    process.env
      .GOOGLE_TRANSLATE_API_KEY;

  /*
   * API Key가 없으면
   * 앱 자체는 죽이지 않고
   * 원문 사용
   */
  if (!apiKey) {
    console.error(
      "GOOGLE_TRANSLATE_API_KEY가 없습니다."
    );

    return {
      text: original,
      translated: false,
    };
  }

  try {
    const body = {
      q: original,

      target:
        "ko",

      format:
        "text",
    };

    /*
     * 일본어임이 확실하면
     * source 지정
     *
     * UPCitemdb에서 영어가 올 수도 있으므로
     * 영어일 때는 자동감지
     */
    if (
      hasJapanese(
        original
      )
    ) {
      body.source =
        "ja";
    }

    const response =
      await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(
          apiKey
        )}`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json; charset=utf-8",
          },

          body:
            JSON.stringify(
              body
            ),
        }
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Google 번역 오류:",
        response.status,
        errorText
      );

      return {
        text: original,
        translated: false,
      };
    }

    const data =
      await response.json();

    const translatedText =
      decodeHtmlEntities(
        data?.data
          ?.translations?.[0]
          ?.translatedText
      );

    if (
      !translatedText
    ) {
      return {
        text: original,
        translated: false,
      };
    }

    console.log(
      "상품명 번역:",
      original,
      "→",
      translatedText
    );

    return {
      text:
        translatedText,

      translated:
        translatedText !==
        original,
    };
  } catch (error) {
    console.error(
      "상품명 번역 오류:",
      error
    );

    return {
      text: original,
      translated: false,
    };
  }
}

/*
 * 한국 쇼핑 검색용 검색어
 */
function buildKoreanSearchKeyword(
  nameKo,
  brand = ""
) {
  const name =
    cleanText(nameKo);

  const cleanBrand =
    cleanText(brand);

  if (!name) {
    return "";
  }

  /*
   * Open Facts / UPCitemdb에서
   * 브랜드까지 얻었다면
   * 검색 정확도 향상을 위해 추가
   *
   * 단, 이미 상품명에 브랜드가 있으면
   * 중복 추가하지 않음
   */
  if (
    cleanBrand &&
    !name
      .toLowerCase()
      .includes(
        cleanBrand
          .toLowerCase()
      )
  ) {
    return `${cleanBrand} ${name}`
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  }

  return name;
}

/*
 * =================================
 * Google Shopping Japan 결과 점수
 * =================================
 *
 * 단품을 우선하고
 * 중고/묶음 상품은 뒤로 보냄
 */
function scoreShoppingResult(
  result
) {
  const title =
    cleanText(
      result?.title
    );

  const source =
    cleanText(
      result?.source
    );

  if (!title) {
    return 9999;
  }

  let score = 0;

  /*
   * 여러 개 묶음 상품
   */
  if (
    /\d+\s*(個|本|袋|箱)\s*(セット|パック)/i.test(
      title
    )
  ) {
    score += 60;
  }

  /*
   * 단순 세트 상품도
   * 단품보다 조금 뒤로
   */
  if (
    /セット/i.test(
      title
    )
  ) {
    score += 15;
  }

  /*
   * 중고/플리마성 결과
   */
  if (
    /(お値下げ|値下げ|中古|まとめ買い)/i.test(
      title
    )
  ) {
    score += 50;
  }

  if (
    /(メルカリ|フリマ)/i.test(
      `${title} ${source}`
    )
  ) {
    score += 80;
  }

  /*
   * 카테고리가 제목에
   * 붙은 결과
   */
  if (
    title.includes(">")
  ) {
    score += 15;
  }

  /*
   * 지나치게 긴 판매자 제목
   */
  if (
    title.length > 100
  ) {
    score += 15;
  }

  return score;
}

/*
 * =================================
 * 1순위
 * Google Shopping Japan
 * =================================
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

    if (
      data.error
    ) {
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
     * 단품/정상 판매상품 우선
     */
    const sorted =
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
      sorted.find(
        (result) => {
          const title =
            cleanProductTitle(
              result?.title
            );

          return (
            title.length >=
            3
          );
        }
      );

    if (!item) {
      return null;
    }

    const name =
      cleanProductTitle(
        item.title
      );

    if (!name) {
      return null;
    }

    return {
      jan,

      name,

      brand:
        "",

      category:
        "",

      imageUrl:
        cleanText(
          item.thumbnail
        ) ||
        cleanText(
          item.serpapi_thumbnail
        ),

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
 * =================================
 * 2순위
 * Open Facts
 * =================================
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
      cleanProductTitle(
        cleanText(
          item.product_name_ja
        ) ||
        cleanText(
          item.product_name
        ) ||
        cleanText(
          item.product_name_en
        )
      );

    const brand =
      cleanText(
        item.brands
      );

    if (!name) {
      return null;
    }

    /*
     * Lip Balm 하나만 있는
     * 데이터는 사용하지 않음
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

      seller:
        "",

      source:
        "Open Facts",

      sourceUrl:
        "",
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
 * =================================
 * 3순위
 * UPCitemdb
 * =================================
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
        404 ||
      response.status ===
        429
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

    const imageUrl =
      Array.isArray(
        item.images
      ) &&
      item.images.length > 0
        ? cleanText(
            item.images[0]
          )
        : "";

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
 * =================================
 * 상품 최종 정리
 * =================================
 *
 * 외부 DB 상품
 * ↓
 * 번역
 * ↓
 * 한국 검색용 키워드 생성
 */
async function finalizeProduct(
  product
) {
  const originalName =
    cleanProductTitle(
      product.name
    );

  const translation =
    await translateToKorean(
      originalName
    );

  const nameKo =
    cleanText(
      translation.text
    ) ||
    originalName;

  const searchKeyword =
    buildKoreanSearchKeyword(
      nameKo,
      product.brand
    );

  return {
    ...product,

    /*
     * 기존 BarcodeScanner가
     * externalProduct.name을 사용하므로
     * name에는 한국어 번역을 넣는다.
     */
    name:
      nameKo,

    /*
     * 디버깅/추후 UI용
     */
    originalName,

    nameKo,

    searchKeyword,

    translated:
      translation.translated,
  };
}

/*
 * =================================
 * API
 * =================================
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
   * 개발 중이므로
   * 검색결과 캐시 X
   */
  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  try {
    let product = null;

    /*
     * 1.
     * Google Shopping Japan
     */
    product =
      await searchGoogleShoppingJapan(
        jan
      );

    /*
     * 2.
     * Open Facts
     */
    if (!product) {
      product =
        await searchOpenFacts(
          jan
        );
    }

    /*
     * 3.
     * UPCitemdb
     */
    if (!product) {
      product =
        await searchUpcItemDb(
          jan
        );
    }

    /*
     * 어디에도 없음
     */
    if (!product) {
      return res
        .status(200)
        .json({
          found:
            false,

          jan,
        });
    }

    /*
     * 상품을 찾은 뒤
     * 딱 한 번만 번역
     */
    const finalProduct =
      await finalizeProduct(
        product
      );

    return res
      .status(200)
      .json({
        found:
          true,

        product:
          finalProduct,
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