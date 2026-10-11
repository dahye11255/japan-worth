/*
 * JapanWorth 상품 자동 조회 API
 *
 * JAN → 상품 식별 → 사진 → 한국어 번역
 *
 * 4589546890796:
 * 검증된 헤어오일 본품 정보로 보정
 *
 * 나머지 JAN:
 * Google Search Japan → Open Facts → UPCitemdb
 *
 * 사진은 Google Shopping Japan에서
 * 동일한 상품 종류일 때만 사용
 */

const VERSION = "jan-variant-v4";

const SERP_URL =
  "https://serpapi.com/search.json";

const TRANSLATE_URL =
  "https://translation.googleapis.com/language/translate/v2";

/*
 * 실제 JAN과 상품명이 확인된 데모 상품
 *
 * 나머지 상품은 외부 검색을 계속 사용함
 */
const VERIFIED_PRODUCTS = {
  "4589546890796": {
    name:
      "&honey アンドハニー ディープモイスト ヘアオイル 3.0 100mL",

    nameKo:
      "앤드허니 딥모이스트 헤어오일 3.0 100ml",

    brand: "&honey",

    category: "haircare",

    source:
      "JAN 검증 상품정보 (Loft)",

    sourceUrl:
      "https://www.loft.co.jp/store/g/g4589546890796/",

    kind: "hair-oil",

    imageQuery:
      "&honey ディープモイスト ヘアオイル 3.0 100ml",
  },
};

/*
 * 문자열 처리
 */
function str(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalized(value) {
  return str(value)
    .normalize("NFKC")
    .toLowerCase();
}

/*
 * JAN 일치 확인
 */
function hasJan(value, jan) {
  return str(value)
    .replace(/[^0-9]/g, "")
    .includes(jan);
}

/*
 * HTTPS 주소만 사용
 */
function httpsUrl(value) {
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
 * 쇼핑몰 제목 정리
 */
function cleanTitle(value) {
  return str(value)
    .normalize("NFKC")
    .replace(
      /【[^】]*】|\[[^\]]*\]/g,
      " "
    )
    .replace(
      /^(?:クーポン有|お値下げ|値下げ|送料無料|SALE|セール)\s*/gi,
      ""
    )
    .replace(
      /(?:送料無料|送料込|送料込み|メール便|定形外郵便での配送)/g,
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
      /(?:JAN|EAN)(?:コード|code)?\s*[:：]?\s*\d{8,14}/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

/*
 * 의미 없는 일반 상품명 제외
 */
function generic(value) {
  return [
    "",
    "lip balm",
    "hair oil",
    "shampoo",
    "product",
    "cosmetics",
    "eye drops",
  ].includes(normalized(value));
}

/*
 * 리필 판별
 */
function isRefill(value) {
  return /(詰\s*替|詰め替え|詰め換え|つめかえ|リフィル|レフィル|refill|리필)/i.test(
    normalized(value)
  );
}

/*
 * 묶음 상품 판별
 */
function isBundle(value) {
  return /(?:[2-9]\d*\s*(?:個|本|袋|箱)\s*(?:入り|入|セット|パック)|[×x]\s*[2-9]\d*\s*(?:個|本|袋|箱)?|(?:シャンプー|shampoo).*(?:トリートメント|treatment))/.test(
    normalized(value)
  );
}

/*
 * 상품 종류 판별
 *
 * 가장 중요한 부분:
 * 헤어오일과 샴푸를 구분
 */
function kind(value) {
  const v = normalized(value);

  if (
    /(ヘア\s*オイル|hair\s*oil|헤어\s*오일)/i.test(v)
  ) {
    return "hair-oil";
  }

  if (
    /(シャンプー|shampoo|샴푸)/i.test(v)
  ) {
    return "shampoo";
  }

  if (
    /(トリートメント|treatment|트리트먼트|컨디셔너)/i.test(v)
  ) {
    return "treatment";
  }

  if (
    /(リップ|lipstick|lip\s*balm|립스틱|립밤)/i.test(v)
  ) {
    return "lip";
  }

  return "";
}

/*
 * 상품명 유사도
 */
function matchScore(a, b) {
  const shape = (s) =>
    normalized(cleanTitle(s))
      .replace(/[^\p{L}\p{N}]/gu, "");

  const x = shape(a);
  const y = shape(b);

  if (
    x.length < 4 ||
    y.length < 4
  ) {
    return 0;
  }

  const ax = new Set();
  const by = new Set();

  for (
    let i = 0;
    i < x.length - 1;
    i++
  ) {
    ax.add(x.slice(i, i + 2));
  }

  for (
    let i = 0;
    i < y.length - 1;
    i++
  ) {
    by.add(y.slice(i, i + 2));
  }

  let overlap = 0;

  for (const item of ax) {
    if (by.has(item)) {
      overlap++;
    }
  }

  return (
    (2 * overlap) /
    (ax.size + by.size)
  );
}

/*
 * 외부 API 요청
 */
async function requestJson(
  url,
  options = {}
) {
  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    7500
  );

  try {
    const response =
      await fetch(url, {
        ...options,
        signal:
          controller.signal,
      });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(
      "Product API fetch:",
      error.message
    );

    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/*
 * SerpApi
 */
async function serp(params) {
  const apiKey =
    process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const query =
    new URLSearchParams({
      ...params,
      api_key: apiKey,
    });

  const data =
    await requestJson(
      `${SERP_URL}?${query}`
    );

  if (data?.error) {
    console.error(
      "SerpApi:",
      data.error
    );

    return null;
  }

  return data;
}

/*
 * JAN이 확인된 Google 검색결과 점수
 */
function googleScore(
  result,
  jan
) {
  const title =
    str(result.title);

  const snippet =
    str(result.snippet);

  const link =
    str(result.link);

  if (
    !title ||
    !(
      hasJan(title, jan) ||
      hasJan(snippet, jan) ||
      hasJan(link, jan)
    )
  ) {
    return -Infinity;
  }

  if (
    generic(cleanTitle(title))
  ) {
    return -Infinity;
  }

  let score = 0;

  if (hasJan(link, jan)) {
    score += 90;
  }

  if (hasJan(title, jan)) {
    score += 75;
  }

  if (hasJan(snippet, jan)) {
    score += 50;
  }

  if (
    /loft\.co\.jp|matsukiyococokara|sundrug|seims|rohto|yodobashi|aeon|rakuten/i.test(
      link
    )
  ) {
    score += 25;
  }

  if (
    /一覧|ランキング|関連商品|まとめ|検索結果/i.test(
      title
    )
  ) {
    score -= 100;
  }

  if (
    /中古|クーポン|メルカリ|ヤフオク|まとめ売り/i.test(
      title
    )
  ) {
    score -= 45;
  }

  if (isBundle(title)) {
    score -= 20;
  }

  return score;
}

/*
 * Google Japan에서 정확 JAN 검색
 */
async function lookupGoogle(jan) {
  const data =
    await serp({
      engine: "google",
      q: `"${jan}"`,
      gl: "jp",
      hl: "ja",
      num: "10",
    });

  const ranked = (
    Array.isArray(
      data?.organic_results
    )
      ? data.organic_results
      : []
  )
    .map((result) => ({
      result,
      score:
        googleScore(
          result,
          jan
        ),
    }))
    .filter((item) =>
      Number.isFinite(
        item.score
      )
    )
    .sort(
      (a, b) =>
        b.score - a.score
    );

  if (!ranked.length) {
    return null;
  }

  const result =
    ranked[0].result;

  return {
    jan,

    name:
      cleanTitle(
        result.title
      ),

    brand: "",
    category: "",
    imageUrl: "",
    quantity: "",
    productQuantity: null,
    seller: "",

    source:
      "Google Search Japan (JAN 확인)",

    sourceUrl:
      httpsUrl(
        result.link
      ),
  };
}

/*
 * Open Facts
 */
async function lookupOpenFacts(
  jan
) {
  const fields =
    "code,product_name,product_name_ja,product_name_en,brands,categories,image_front_url,image_url,quantity,product_quantity";

  const data =
    await requestJson(
      `https://world.openfoodfacts.org/api/v2/product/${jan}?product_type=all&fields=${fields}`,
      {
        headers: {
          "User-Agent":
            "JapanWorth/1.0 (https://japan-worth.vercel.app)",
        },
      }
    );

  const product =
    data?.product;

  if (
    data?.status !== 1 ||
    str(product?.code) !== jan
  ) {
    return null;
  }

  const name =
    cleanTitle(
      product.product_name_ja ||
      product.product_name ||
      product.product_name_en
    );

  if (generic(name)) {
    return null;
  }

  return {
    jan,
    name,

    brand:
      str(product.brands),

    category:
      str(product.categories),

    imageUrl:
      httpsUrl(
        product.image_front_url ||
        product.image_url
      ),

    quantity:
      str(product.quantity),

    productQuantity:
      product.product_quantity ??
      null,

    seller: "",

    source:
      "Open Facts (JAN 확인)",

    sourceUrl: "",
  };
}

/*
 * UPCitemdb
 */
async function lookupUpc(jan) {
  const data =
    await requestJson(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${jan}`
    );

  const items =
    Array.isArray(data?.items)
      ? data.items
      : [];

  const item =
    items.find((i) =>
      [i.ean, i.upc].some(
        (code) => {
          const c =
            String(code || "");

          return (
            c === jan ||
            (
              jan.startsWith("0") &&
              c === jan.slice(1)
            )
          );
        }
      )
    );

  if (!item) {
    return null;
  }

  const name =
    cleanTitle(
      item.title
    );

  if (generic(name)) {
    return null;
  }

  return {
    jan,
    name,

    brand:
      str(item.brand),

    category:
      str(item.category),

    imageUrl:
      httpsUrl(
        Array.isArray(
          item.images
        )
          ? item.images[0]
          : ""
      ),

    quantity:
      str(item.weight),

    productQuantity: null,
    seller: "",

    source:
      "UPCitemdb (JAN 확인)",

    sourceUrl: "",
  };
}

/*
 * =====================================
 * 사진이 실제 동일 상품인지 확인
 * =====================================
 */
function imageMatches(
  product,
  title
) {
  const a =
    normalized(
      product.name
    );

  const b =
    normalized(title);

  const expectedKind =
    product.kind ||
    kind(a);

  const actualKind =
    kind(b);

  /*
   * 헤어오일 ≠ 샴푸
   * 헤어오일 ≠ 트리트먼트
   * 립밤 ≠ 다른 종류
   */
  if (
    expectedKind &&
    actualKind !== expectedKind
  ) {
    return false;
  }

  /*
   * 헤어오일 제목 안에
   * 샴푸나 트리트먼트가 섞인
   * 세트상품 제외
   */
  if (
    expectedKind ===
      "hair-oil" &&
    /(シャンプー|shampoo|トリートメント|treatment|샴푸|트리트먼트)/i.test(
      b
    )
  ) {
    return false;
  }

  /*
   * 본품과 리필 구별
   */
  if (
    isRefill(a) !==
    isRefill(b)
  ) {
    return false;
  }

  /*
   * 단품과 묶음 구별
   */
  if (
    isBundle(a) !==
    isBundle(b)
  ) {
    return false;
  }

  /*
   * 헤어오일일 경우
   * STEP 3.0 필수
   */
  if (
    expectedKind ===
    "hair-oil"
  ) {
    if (
      !/(3[.]0|step\s*3)/i.test(
        b
      )
    ) {
      return false;
    }

    /*
     * 용량이 적혀 있다면
     * 100mL인지 확인
     */
    if (
      /(\d+)\s*(?:ml|ミリリットル)/i.test(
        b
      ) &&
      !/100\s*(?:ml|ミリリットル)/i.test(
        b
      )
    ) {
      return false;
    }

    /*
     * 딥모이스트 시리즈 구별
     */
    if (
      a.includes(
        "ディープモイスト"
      ) &&
      !/(ディープ\s*モイスト|deep\s*moist)/i.test(
        b
      )
    ) {
      return false;
    }
  }

  /*
   * 립밤 XD 모델 구별
   */
  if (
    expectedKind === "lip" &&
    a.includes("xd") &&
    !b.includes("xd")
  ) {
    return false;
  }

  /*
   * 마지막으로 상품명 유사도 확인
   */
  return (
    matchScore(a, b) >= 0.5
  );
}

/*
 * Google Shopping Japan에서
 * 사진만 가져오기
 *
 * 이 함수는 상품명을
 * 절대 바꾸지 않는다.
 */
async function addShoppingImage(
  product
) {
  const data =
    await serp({
      engine:
        "google_shopping",

      q:
        product.imageQuery ||
        product.name,

      gl: "jp",
      hl: "ja",

      google_domain:
        "google.co.jp",
    });

  const items =
    Array.isArray(
      data?.shopping_results
    )
      ? data.shopping_results
      : [];

  const best =
    items
      .filter((item) =>
        imageMatches(
          product,
          str(item.title)
        )
      )
      .map((item) => ({
        item,

        score:
          matchScore(
            product.name,
            item.title
          ),

        image:
          httpsUrl(
            item.thumbnail ||
            item.serpapi_thumbnail
          ),
      }))
      .filter(
        (item) =>
          item.image
      )
      .sort(
        (a, b) =>
          b.score - a.score
      )[0];

  /*
   * 정확한 이미지가 없으면
   * 다른 상품 사진을 보여주지 않음
   */
  return best
    ? {
        ...product,
        imageUrl:
          best.image,
      }
    : product;
}

/*
 * 번역 응답 HTML 문자 처리
 */
function decodeHtml(value) {
  return str(value)
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&#39;|&#x27;/gi,
      "'"
    )
    .replace(
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    );
}

/*
 * Google 번역 API
 */
async function translate(name) {
  /*
   * 이미 한글이면 번역 불필요
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

  const body = {
    q: name,
    target: "ko",
    format: "text",
  };

  if (
    /[ぁ-んァ-ヶ一-龯]/.test(
      name
    )
  ) {
    body.source = "ja";
  }

  const data =
    await requestJson(
      TRANSLATE_URL,
      {
        method: "POST",

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
      }
    );

  const result =
    decodeHtml(
      data?.data
        ?.translations?.[0]
        ?.translatedText
    );

  return result
    ? {
        nameKo: result,

        translated:
          result !== name,

        translationStatus:
          "ok",
      }
    : {
        nameKo: name,

        translated: false,

        translationStatus:
          "api_error",
      };
}

/*
 * =====================================
 * 최종 API
 * =====================================
 */
export default async function handler(
  req,
  res
) {
  res.setHeader(
    "Cache-Control",
    "no-store"
  );

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

  if (
    !/^\d{8,14}$/.test(
      jan
    )
  ) {
    return res
      .status(400)
      .json({
        error:
          "JAN / EAN 코드 8~14자리를 입력해주세요.",
      });
  }

  try {
    /*
     * 검증된 헤어오일은
     * 올바른 본품 이름 사용
     */
    const trusted =
      VERIFIED_PRODUCTS[jan];

    let product = trusted
      ? {
          jan,
          ...trusted,

          imageUrl: "",
          quantity: "",
          productQuantity:
            null,
          seller: "",
        }
      : await lookupGoogle(
          jan
        );

    /*
     * 다른 JAN은 외부 DB 순차 조회
     */
    if (!product) {
      product =
        await lookupOpenFacts(
          jan
        );
    }

    if (!product) {
      product =
        await lookupUpc(
          jan
        );
    }

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
     * 이미지 / 번역을 병렬 처리
     */
    const [
      withImage,
      translated,
    ] = await Promise.all([
      addShoppingImage(
        product
      ),

      product.nameKo
        ? Promise.resolve({
            nameKo:
              product.nameKo,

            translated: true,

            translationStatus:
              "verified_korean_name",
          })
        : translate(
            product.name
          ),
    ]);

    const nameKo =
      translated.nameKo;

    /*
     * 기존 BarcodeScanner,
     * PriceComparison과 호환
     */
    return res
      .status(200)
      .json({
        found: true,

        lookupVersion:
          VERSION,

        product: {
          jan,

          name:
            nameKo,

          originalName:
            product.name,

          nameKo,

          brand:
            withImage.brand ||
            "",

          category:
            withImage.category ||
            "",

          imageUrl:
            withImage.imageUrl ||
            "",

          quantity:
            withImage.quantity ||
            "",

          productQuantity:
            withImage.productQuantity ??
            null,

          seller:
            withImage.seller ||
            "",

          source:
            withImage.source,

          sourceUrl:
            withImage.sourceUrl ||
            "",

          searchKeyword:
            nameKo,

          translated:
            translated.translated,

          translationStatus:
            translated.translationStatus,
        },
      });
  } catch (error) {
    console.error(
      "Product lookup:",
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