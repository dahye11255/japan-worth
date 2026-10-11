/*
 * JapanWorth 상품 자동 조회 API
 *
 * GET /api/product?jan=4987241105052
 *
 * 조회 순서
 *
 * 1. Google 일반검색 Japan
 *    → 정확한 JAN이 포함된 검색결과만 인정
 *
 * 2. Open Facts
 *    → JAN 일치 확인
 *
 * 3. UPCitemdb
 *    → JAN 일치 확인
 *
 * 상품 식별 성공 후
 *
 * 4. Google Shopping Japan
 *    → 같은 상품의 사진만 가져오기
 *
 * 5. Google Cloud Translation
 *    → 한국어 번역
 *
 * 6. searchKeyword 반환
 *    → 기존 한국 가격비교 기능에서 사용
 */

const VERSION = "jan-first-v3";

const SERP_URL =
  "https://serpapi.com/search.json";

const TRANSLATE_URL =
  "https://translation.googleapis.com/language/translate/v2";


/*
 * 문자열 정리
 */
function text(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}


/*
 * 검색결과에서 JAN 존재 확인
 */
function containsJan(value, jan) {
  return text(value)
    .replace(/[^0-9]/g, "")
    .includes(jan);
}


/*
 * 일본 상품명 정리
 *
 * 쿠폰, 배송, 쇼핑몰 광고 문구 제거
 */
function cleanTitle(value) {
  return text(value)
    .normalize("NFKC")
    .replace(
      /【[^】]*】|\[[^\]]*\]/g,
      " "
    )
    .replace(
      /^(?:クーポン有|クーポンあり|お値下げ|値下げ|送料無料|SALE|セール)\s*/gi,
      ""
    )
    .replace(
      /(?:送料無料|送料込み|送料込|メール便|定形外郵便での配送|クーポン有)/g,
      " "
    )
    .replace(
      /\([^)]*(?:配送|送料|発送)[^)]*\)/g,
      " "
    )
    .replace(
      /\s+[|｜]\s+.*$/,
      ""
    )
    .replace(
      /\s+[-–—]\s+[^\n]*(?:ストア|ショップ|ドラッグ|通販|公式|楽天|Amazon|ロフト|マツキヨ|セイムス)[^\n]*$/i,
      ""
    )
    .replace(
      /\b(?:JAN|EAN)\s*(?:コード|code)?\s*[:：]?\s*\d{8,14}\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}


/*
 * 너무 일반적인 상품명 제외
 */
function genericName(value) {
  const name =
    text(value).toLowerCase();

  return (
    !name ||
    [
      "lip balm",
      "shampoo",
      "hair oil",
      "cosmetics",
      "product",
      "eye drops",
    ].includes(name)
  );
}


/*
 * 리필 상품 판별
 */
function isRefill(value) {
  return /(詰\s*替|詰め替え|詰め換え|つめかえ|リフィル|レフィル|refill)/i.test(
    text(value)
  );
}


/*
 * 다개입 / 묶음 상품 판별
 *
 * 예:
 * 2本入
 * 3個セット
 * 4g×2本
 */
function isMultipack(value) {
  return /(?:[2-9]\d*\s*(?:個|本|袋|箱)\s*(?:入り|入|組|セット|パック)|[×xX]\s*[2-9]\d*\s*(?:個|本|袋|箱)?|[2-9]\d*\s*(?:個|本|袋|箱)\s*[×xX])/i.test(
    text(value).normalize("NFKC")
  );
}


/*
 * 상품명 유사도 비교용 정규화
 */
function normalizeMatch(value) {
  return cleanTitle(value)
    .toLowerCase()
    .replace(
      /(?:送料無料|公式|限定|セール|販売|商品|通販|在庫|新品)/g,
      ""
    )
    .replace(
      /[^\p{L}\p{N}]/gu,
      ""
    );
}


/*
 * 2글자 단위 문자열 생성
 */
function bigrams(value) {
  const result = new Set();

  for (
    let i = 0;
    i < value.length - 1;
    i += 1
  ) {
    result.add(
      value.slice(i, i + 2)
    );
  }

  return result;
}


/*
 * 상품명 유사도
 *
 * 0 ~ 1 사이 값
 */
function similarity(a, b) {
  const left = bigrams(
    normalizeMatch(a)
  );

  const right = bigrams(
    normalizeMatch(b)
  );

  if (
    !left.size ||
    !right.size
  ) {
    return 0;
  }

  let matched = 0;

  for (const unit of left) {
    if (right.has(unit)) {
      matched += 1;
    }
  }

  return (
    (2 * matched) /
    (left.size + right.size)
  );
}


/*
 * HTTPS URL만 허용
 */
function safeUrl(value) {
  try {
    const url = new URL(value);

    return url.protocol === "https:"
      ? url.href
      : "";
  } catch {
    return "";
  }
}


/*
 * 외부 API 타임아웃
 */
async function fetchTimed(
  url,
  options = {},
  timeout = 6500
) {
  const controller =
    new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeout
  );

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}


/*
 * SerpApi 공통 호출
 */
async function serpApi(params) {
  const apiKey =
    process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    console.error(
      "SERPAPI_API_KEY가 없습니다."
    );

    return null;
  }

  const query =
    new URLSearchParams({
      ...params,
      api_key: apiKey,
    });

  try {
    const response =
      await fetchTimed(
        `${SERP_URL}?${query}`,
        {},
        7000
      );

    if (!response.ok) {
      console.error(
        "SerpApi HTTP 오류:",
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

    return data;
  } catch (error) {
    console.error(
      "SerpApi 요청 실패:",
      error.message
    );

    return null;
  }
}


/*
 * 정확한 JAN이 포함된
 * 일본 Google 검색결과만 평가
 *
 * JAN이 없으면 무조건 탈락
 */
function verifiedGoogleScore(
  result,
  jan
) {
  const title =
    text(result?.title);

  const snippet =
    text(result?.snippet);

  const link =
    text(result?.link);

  const matchTitle =
    containsJan(title, jan);

  const matchSnippet =
    containsJan(snippet, jan);

  const matchLink =
    containsJan(link, jan);

  /*
   * JAN 일치 증거 없음
   */
  if (
    !title ||
    !(
      matchTitle ||
      matchSnippet ||
      matchLink
    )
  ) {
    return -Infinity;
  }

  const clean =
    cleanTitle(title);

  if (
    clean.length < 5 ||
    genericName(clean)
  ) {
    return -Infinity;
  }

  /*
   * JAN이 URL에 있는
   * 개별 상품 페이지 우선
   */
  let score =
    (matchLink ? 90 : 0) +
    (matchTitle ? 80 : 0) +
    (matchSnippet ? 65 : 0);

  /*
   * 일본 판매처 / 상품 페이지 가점
   */
  if (
    /rohto|loft|matsukiyo|sundrug|seims|welcia|cosme|kyorindo|yodobashi|sankodo|rakuten|amazon\.co\.jp/i.test(
      link
    )
  ) {
    score += 25;
  }

  /*
   * 코드 목록 / 관련상품 페이지 감점
   */
  if (
    /(JANコード一覧|バーコード検索|商品コード検索|価格比較一覧|関連商品|ランキング)/.test(
      title
    )
  ) {
    score -= 90;
  }

  /*
   * 중고 / 광고 판매글 감점
   */
  if (
    /(メルカリ|ヤフオク|中古|まとめ売り|クーポン|福袋)/.test(
      title
    )
  ) {
    score -= 55;
  }

  if (isMultipack(title)) {
    score -= 15;
  }

  if (
    clean.length > 110
  ) {
    score -= 20;
  }

  return score;
}


/*
 * =================================
 * 1. Google Japan 정확 JAN 검색
 * =================================
 *
 * Shopping이 아니라 일반 Google 검색
 *
 * 검색결과 제목 / 요약 / URL 중
 * 정확한 JAN이 보이는 경우만 인정
 */
async function lookupGoogleJan(
  jan
) {
  const data =
    await serpApi({
      engine: "google",
      q: `"${jan}"`,
      gl: "jp",
      hl: "ja",
      num: "10",
    });

  const results =
    Array.isArray(
      data?.organic_results
    )
      ? data.organic_results
      : [];

  const ranked =
    results
      .map((result) => ({
        result,
        score:
          verifiedGoogleScore(
            result,
            jan
          ),
      }))
      .filter(({ score }) =>
        Number.isFinite(score)
      )
      .sort(
        (a, b) =>
          b.score - a.score
      );

  if (!ranked.length) {
    return null;
  }

  const item =
    ranked[0].result;

  return {
    jan,

    name:
      cleanTitle(item.title),

    brand: "",

    category: "",

    imageUrl:
      safeUrl(
        item.thumbnail
      ),

    quantity: "",

    productQuantity:
      null,

    seller: "",

    source:
      "Google Search Japan (JAN 확인)",

    sourceUrl:
      safeUrl(
        item.link
      ),

    verification:
      "JAN in search title, snippet, or URL",
  };
}


/*
 * =================================
 * 2. Google Shopping 사진 검색
 * =================================
 *
 * 여기서는 상품명을 결정하지 않는다.
 *
 * 이미 확인된 상품명과
 * 유사한 상품 사진만 선택한다.
 *
 * 본품이면 리필 제외
 * 단품이면 묶음상품 제외
 */
async function enrichShoppingImage(
  product
) {
  const data =
    await serpApi({
      engine:
        "google_shopping",

      q:
        product.name,

      gl:
        "jp",

      hl:
        "ja",

      google_domain:
        "google.co.jp",
    });

  const results =
    Array.isArray(
      data?.shopping_results
    )
      ? data.shopping_results
      : [];

  const candidates =
    results
      .filter((item) => {
        const name =
          text(item?.title);

        if (!name) {
          return false;
        }

        /*
         * 본품 / 리필 불일치 제외
         */
        if (
          isRefill(name) !==
          isRefill(product.name)
        ) {
          return false;
        }

        /*
         * 단품 / 묶음 불일치 제외
         */
        if (
          isMultipack(name) !==
          isMultipack(product.name)
        ) {
          return false;
        }

        return Boolean(
          safeUrl(
            item?.thumbnail ||
            item?.serpapi_thumbnail
          )
        );
      })
      .map((item) => ({
        item,

        match:
          similarity(
            item.title,
            product.name
          ),
      }))
      .filter(
        ({ match }) =>
          match >= 0.38
      )
      .sort(
        (a, b) =>
          b.match - a.match
      );

  /*
   * 신뢰할 수 있는 사진이 없으면
   * 아무 사진이나 가져오지 않는다.
   */
  if (!candidates.length) {
    return product;
  }

  const image =
    candidates[0].item;

  return {
    ...product,

    imageUrl:
      safeUrl(
        image.thumbnail ||
        image.serpapi_thumbnail
      ) ||
      product.imageUrl,
  };
}


/*
 * =================================
 * 3. Open Facts
 * =================================
 */
async function lookupOpenFacts(
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
      `?product_type=all&fields=${fields}`;

    const response =
      await fetchTimed(
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

    if (!response.ok) {
      return null;
    }

    const data =
      await response.json();

    const item =
      data?.product;

    /*
     * DB 바코드가 정확히 같아야 함
     */
    if (
      data.status !== 1 ||
      !item ||
      text(item.code) !== jan
    ) {
      return null;
    }

    const name =
      cleanTitle(
        item.product_name_ja ||
        item.product_name ||
        item.product_name_en
      );

    if (genericName(name)) {
      return null;
    }

    return {
      jan,

      name,

      brand:
        text(item.brands),

      category:
        text(
          item.categories
        ).includes(
          "incorrect product type"
        )
          ? ""
          : text(
              item.categories
            ),

      imageUrl:
        safeUrl(
          item.image_front_url ||
          item.image_url
        ),

      quantity:
        text(
          item.quantity
        ),

      productQuantity:
        item.product_quantity ??
        null,

      seller: "",

      source:
        "Open Facts (JAN 확인)",

      sourceUrl: "",

      verification:
        "exact barcode in database",
    };
  } catch (error) {
    console.error(
      "Open Facts:",
      error.message
    );

    return null;
  }
}


/*
 * =================================
 * 4. UPCitemdb
 * =================================
 */
async function lookupUpc(
  jan
) {
  try {
    const url =
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(
        jan
      )}`;

    const response =
      await fetchTimed(
        url,
        {
          headers: {
            Accept:
              "application/json",
          },
        }
      );

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

    /*
     * UPCitemdb가 다른 바코드를
     * 반환하는 경우 방지
     */
    const item =
      items.find(
        (entry) => {
          const codes = [
            entry.ean,
            entry.upc,
          ]
            .filter(Boolean)
            .map(String);

          return codes.some(
            (code) =>
              code === jan ||
              (
                jan.startsWith(
                  "0"
                ) &&
                code ===
                  jan.slice(1)
              )
          );
        }
      );

    if (!item) {
      return null;
    }

    const name =
      cleanTitle(
        item.title
      );

    if (genericName(name)) {
      return null;
    }

    return {
      jan,

      name,

      brand:
        text(item.brand),

      category:
        text(item.category),

      imageUrl:
        safeUrl(
          Array.isArray(
            item.images
          )
            ? item.images[0]
            : ""
        ),

      quantity:
        text(item.weight),

      productQuantity:
        null,

      seller: "",

      source:
        "UPCitemdb (JAN 확인)",

      sourceUrl: "",

      verification:
        "exact barcode in database",
    };
  } catch (error) {
    console.error(
      "UPCitemdb:",
      error.message
    );

    return null;
  }
}


/*
 * 번역 API의 HTML 문자 처리
 */
function decodeHtml(value) {
  return text(value)
    .replace(
      /&amp;/g,
      "&"
    )
    .replace(
      /&quot;/g,
      '"'
    )
    .replace(
      /&#39;|&#x27;/gi,
      "'"
    )
    .replace(
      /&lt;/g,
      "<"
    )
    .replace(
      /&gt;/g,
      ">"
    );
}


/*
 * =================================
 * 5. Google Translate
 * =================================
 *
 * Vercel 환경변수:
 *
 * GOOGLE_TRANSLATE_API_KEY
 *
 * API Key는 서버에서만 사용한다.
 */
async function translateKorean(
  name
) {
  /*
   * 이미 한국어 상품명이면
   * 번역하지 않음
   */
  if (
    /[가-힣]/.test(name) &&
    !/[ぁ-んァ-ヶ一-龯]/.test(
      name
    )
  ) {
    return {
      nameKo: name,

      translated: false,

      translationStatus:
        "already_korean",
    };
  }

  const apiKey =
    process.env
      .GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) {
    return {
      nameKo: name,

      translated: false,

      translationStatus:
        "missing_api_key",
    };
  }

  try {
    const body = {
      q: name,

      target: "ko",

      format: "text",
    };

    /*
     * 일본어가 포함되어 있으면
     * 원문 언어를 일본어로 지정
     */
    if (
      /[ぁ-んァ-ヶ一-龯]/.test(
        name
      )
    ) {
      body.source = "ja";
    }

    /*
     * API 키는 URL이 아니라
     * HTTP 헤더로 전송
     */
    const response =
      await fetchTimed(
        TRANSLATE_URL,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json; charset=utf-8",

            "x-goog-api-key":
              apiKey,
          },

          body:
            JSON.stringify(
              body
            ),
        },
        7000
      );

    if (!response.ok) {
      console.error(
        "Translation API 상태:",
        response.status
      );

      return {
        nameKo: name,

        translated: false,

        translationStatus:
          "api_error",
      };
    }

    const data =
      await response.json();

    const value =
      decodeHtml(
        data?.data
          ?.translations?.[0]
          ?.translatedText
      );

    if (!value) {
      return {
        nameKo: name,

        translated: false,

        translationStatus:
          "empty_result",
      };
    }

    return {
      nameKo: value,

      translated:
        value !== name,

      translationStatus:
        "ok",
    };
  } catch (error) {
    console.error(
      "Translation API:",
      error.message
    );

    return {
      nameKo: name,

      translated: false,

      translationStatus:
        "api_error",
    };
  }
}


/*
 * =================================
 * 최종 API
 * =================================
 */
export default async function handler(
  req,
  res
) {
  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  /*
   * GET만 지원
   */
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

  /*
   * JAN / EAN 검사
   */
  if (
    !/^\d{8,14}$/.test(
      jan
    )
  ) {
    return res
      .status(400)
      .json({
        error:
          "JAN / EAN 코드 8~14자리가 필요합니다.",
      });
  }

  try {
    let product = null;

    /*
     * 1순위:
     * 정확 JAN Google 일반검색
     *
     * Google Shopping은
     * 여기서 사용하지 않는다.
     */
    product =
      await lookupGoogleJan(
        jan
      );

    /*
     * 2순위:
     * Open Facts
     */
    if (!product) {
      product =
        await lookupOpenFacts(
          jan
        );
    }

    /*
     * 3순위:
     * UPCitemdb
     */
    if (!product) {
      product =
        await lookupUpc(
          jan
        );
    }

    /*
     * 식별 실패
     *
     * 아무 상품이나 보여주지 않음
     */
    if (!product) {
      return res
        .status(200)
        .json({
          found: false,

          jan,

          lookupVersion:
            VERSION,
        });
    }

    /*
     * 식별한 상품명 기준으로
     * 사진과 한국어 번역 진행
     *
     * 독립 작업이라 병렬 실행
     * → API 응답시간 단축
     */
    const [
      enrichedProduct,
      translated,
    ] = await Promise.all([
      product.source.startsWith(
        "Google Search"
      )
        ? enrichShoppingImage(
            product
          )
        : Promise.resolve(
            product
          ),

      translateKorean(
        product.name
      ),
    ]);

    /*
     * 기존 BarcodeScanner 및
     * PriceComparison과 호환
     *
     * name = 한국어 상품명
     * searchKeyword = 한국 가격검색어
     */
    return res
      .status(200)
      .json({
        found: true,

        lookupVersion:
          VERSION,

        product: {
          ...enrichedProduct,

          name:
            translated.nameKo,

          originalName:
            product.name,

          nameKo:
            translated.nameKo,

          searchKeyword:
            translated.nameKo,

          translated:
            translated.translated,

          translationStatus:
            translated.translationStatus,
        },
      });
  } catch (error) {
    console.error(
      "Product API:",
      error
    );

    return res
      .status(500)
      .json({
        error:
          "상품 정보 조회 중 오류가 발생했습니다.",
      });
  }
}