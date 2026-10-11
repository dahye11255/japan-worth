/*
 * JapanWorth 상품 자동 조회 API
 *
 * 흐름
 * 1. Google Shopping Japan으로 JAN/EAN 상품 식별
 * 2. 결과가 없으면 Open Facts
 * 3. 그래도 없으면 UPCitemdb
 * 4. 찾은 원문 상품명을 Google Cloud Translation으로 한국어 번역
 * 5. 한국어 상품명을 PriceComparison 검색어로 반환
 */

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function hasJapanese(text) {
  return /[ぁ-んァ-ヶ一-龯]/.test(cleanText(text));
}

function decodeHtmlEntities(text) {
  return cleanText(text)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );
}

function isRefillTitle(title) {
  return /(詰\s*替|詰め替え|詰替え|つめかえ|つめ替え|リフィル|レフィル|詰替用|詰め替え用|refill)/i.test(
    cleanText(title)
  );
}

function isBundleTitle(title) {
  const text = cleanText(title);

  // 1本入/×1은 단품이다. 2본 이상이거나 명시적인 묶음 표현만 구분한다.
  const countPatterns = [
    /(\d+)\s*(?:個|本|袋|箱|点)\s*(?:セット|パック|入)/gi,
    /[×xX]\s*(\d+)\s*(?:個|本|袋|箱|点)?/gi,
  ];

  for (const pattern of countPatterns) {
    for (const match of text.matchAll(pattern)) {
      if (Number(match[1]) >= 2) return true;
    }
  }

  return /(まとめ買い|ケース販売|セット販売|\d+\s*個組)/i.test(text);
}

function isUsedTitle(title, source = "") {
  return /(お値下げ|値下げ|中古|訳あり|ジャンク|メルカリ|フリマ)/i.test(
    `${cleanText(title)} ${cleanText(source)}`
  );
}

function hasPromoNoise(title) {
  return /(クーポン有|クーポンあり|クーポン|ポイント\s*\d+倍|SALE|セール|送料無料|メール便|定形外郵便|送料込|送料込み)/i.test(
    cleanText(title)
  );
}

/*
 * 판매용 잡음을 제거한다.
 * refill 여부는 중요한 상품 변형이므로 제거하지 않는다.
 * preserveBundle=true면 실제 묶음 JAN일 가능성이 높다고 보고 묶음 정보를 보존한다.
 */
function cleanProductTitle(title, options = {}) {
  const { preserveBundle = false } = options;
  let text = cleanText(title);

  if (!text) {
    return "";
  }

  // 판매/할인 문구
  text = text.replace(
    /^(お値下げ|値下げ|価格改定|SALE|セール|特価|クーポン有|クーポンあり|クーポン対象)\s*/gi,
    ""
  );

  text = text.replace(
    /(クーポン有|クーポンあり|クーポン対象|ポイント\s*\d+倍)/gi,
    " "
  );

  // 괄호 안 배송 설명 제거
  text = text.replace(
    /[（(][^）)]*(配送|郵便|メール便|送料|発送)[^）)]*[）)]/gi,
    " "
  );

  // 【送料無料】, [送料無料] 등 판매 태그 제거
  text = text.replace(/【[^】]*】/g, " ");
  text = text.replace(/\[[^\]]*\]/g, " ");

  // 배송 관련 문구
  text = text.replace(
    /(メール便|送料無料|送料込|送料込み|定形外郵便|ネコポス|ゆうパケット)/gi,
    " "
  );

  if (!preserveBundle) {
    // 4g×2本入 -> 4g
    text = text.replace(
      /(\d+(?:\.\d+)?\s*(?:g|kg|ml|mL|ML|L))\s*[×xX]\s*\d+\s*(?:個|本|袋|箱|点)?\s*(?:入|セット|パック)?/gi,
      "$1"
    );

    // 제목 앞 5個セット/, 3本パック/ 등 제거
    text = text.replace(
      /^\s*\d+\s*(個|本|袋|箱|点)\s*(セット|パック)\s*[\/／]?\s*/gi,
      ""
    );

    // 2本入 / 5個セット / 3袋パック 등 제거
    text = text.replace(
      /\d+\s*(個|本|袋|箱|点)\s*(入|セット|パック)/gi,
      " "
    );

    // ×2 / x3 같은 판매 묶음 제거
    text = text.replace(/[×xX]\s*\d+\b/gi, " ");
    text = text.replace(/(まとめ買い|ケース販売|セット販売)/gi, " ");
  }

  // 쇼핑몰 카테고리 경로 제거
  text = text.replace(/[\/／][^\/／]*>.*$/g, "");

  // | 이후 사이트명/광고문구 제거
  text = text.replace(/\|.*$/g, "");

  return text.replace(/\s+/g, " ").trim();
}

function cleanCategory(category) {
  const value = cleanText(category);

  if (!value) {
    return "";
  }

  if (value.toLowerCase().includes("incorrect product type")) {
    return "";
  }

  return value;
}

function isGenericProductName(name) {
  const normalized = cleanText(name).toLowerCase();

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

  return genericNames.includes(normalized);
}

async function translateToKorean(originalText) {
  const original = cleanText(originalText);

  if (!original) {
    return {
      text: "",
      translated: false,
    };
  }

  if (/[가-힣]/.test(original) && !hasJapanese(original)) {
    return {
      text: original,
      translated: false,
    };
  }

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) {
    console.error("GOOGLE_TRANSLATE_API_KEY가 없습니다.");

    return {
      text: original,
      translated: false,
    };
  }

  try {
    const body = {
      q: original,
      target: "ko",
      format: "text",
    };

    if (hasJapanese(original)) {
      body.source = "ja";
    }

    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(
        apiKey
      )}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

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

    const data = await response.json();

    const translatedText = decodeHtmlEntities(
      data?.data?.translations?.[0]?.translatedText
    );

    if (!translatedText) {
      return {
        text: original,
        translated: false,
      };
    }

    return {
      text: translatedText,
      translated: translatedText !== original,
    };
  } catch (error) {
    console.error("상품명 번역 오류:", error);

    return {
      text: original,
      translated: false,
    };
  }
}

function buildKoreanSearchKeyword(nameKo, brand = "") {
  const name = cleanText(nameKo);
  const cleanBrand = cleanText(brand);

  if (!name) {
    return "";
  }

  if (
    cleanBrand &&
    !name.toLowerCase().includes(cleanBrand.toLowerCase())
  ) {
    return `${cleanBrand} ${name}`.replace(/\s+/g, " ").trim();
  }

  return name;
}

/*
 * 쇼핑 검색 결과는 동일 JAN으로 검색해도 판매자가 묶음/리필 글을
 * 섞어 올릴 수 있다. 정상 본품 후보가 하나라도 있다면 우선한다.
 * 모든 결과가 리필이거나 묶음일 때만 해당 형태를 우선한다.
 * (공식 상품 DB가 아니므로 실제 형태를 100% 확인하는 것은 아니다.)
 */
function detectVariantProfile(results) {
  const usable = results.filter(
    (result) => cleanText(result?.title).length >= 3
  );

  if (usable.length === 0) {
    return {
      likelyRefill: false,
      likelyBundle: false,
    };
  }

  return {
    likelyRefill: usable.every((result) => isRefillTitle(result.title)),
    likelyBundle: usable.every((result) => isBundleTitle(result.title)),
  };
}

function scoreShoppingResult(result, profile) {
  const title = cleanText(result?.title);
  const source = cleanText(result?.source);

  if (!title) {
    return 9999;
  }

  let score = 0;

  const refill = isRefillTitle(title);
  const bundle = isBundleTitle(title);

  // refill 여부를 결과 다수결과 맞춘다.
  if (profile.likelyRefill) {
    if (refill) {
      score -= 35;
    } else {
      score += 55;
    }
  } else if (refill) {
    score += 140;
  }

  // 묶음 상품도 같은 방식으로 처리한다.
  if (profile.likelyBundle) {
    if (bundle) {
      score -= 20;
    } else {
      score += 35;
    }
  } else if (bundle) {
    score += 120;
  }

  if (isUsedTitle(title, source)) {
    score += 120;
  }

  if (hasPromoNoise(title)) {
    score += 30;
  }

  if (title.includes(">")) {
    score += 20;
  }

  if (title.length > 100) {
    score += 20;
  }

  // 판매자 문구가 적고 비교적 짧은 제목을 약간 우대
  if (title.length >= 8 && title.length <= 60) {
    score -= 10;
  }

  return score;
}

async function searchGoogleShoppingJapan(jan) {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    console.error("SERPAPI_API_KEY가 없습니다.");
    return null;
  }

  try {
    const params = new URLSearchParams({
      engine: "google_shopping",
      q: jan,
      gl: "jp",
      hl: "ja",
      google_domain: "google.co.jp",
      api_key: apiKey,
    });

    const response = await fetch(
      `https://serpapi.com/search.json?${params.toString()}`
    );

    if (!response.ok) {
      console.error(
        "Google Shopping Japan 오류:",
        response.status
      );
      return null;
    }

    const data = await response.json();

    if (data.error) {
      console.error("SerpApi 오류:", data.error);
      return null;
    }

    const results = Array.isArray(data.shopping_results)
      ? data.shopping_results
      : [];

    if (results.length === 0) {
      return null;
    }

    const profile = detectVariantProfile(results);

    const sorted = [...results].sort(
      (a, b) =>
        scoreShoppingResult(a, profile) -
        scoreShoppingResult(b, profile)
    );

    const item = sorted.find((result) => {
      const title = cleanProductTitle(result?.title, {
        preserveBundle: profile.likelyBundle,
      });

      return title.length >= 3;
    });

    if (!item) {
      return null;
    }

    const name = cleanProductTitle(item.title, {
      preserveBundle: profile.likelyBundle,
    });

    if (!name) {
      return null;
    }

    return {
      jan,
      name,
      brand: "",
      category: "",
      imageUrl:
        cleanText(item.thumbnail) ||
        cleanText(item.serpapi_thumbnail),
      quantity: "",
      productQuantity: null,
      seller: cleanText(item.source),
      source: "Google Shopping Japan",
      sourceUrl:
        cleanText(item.product_link) ||
        cleanText(item.link),
      variant: {
        refill: isRefillTitle(item.title),
        bundle: isBundleTitle(item.title),
      },
    };
  } catch (error) {
    console.error(
      "Google Shopping Japan 조회 오류:",
      error
    );
    return null;
  }
}

async function searchOpenFacts(jan) {
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
        "User-Agent":
          "JapanWorth/1.0 (https://japan-worth.vercel.app)",
      },
    });

    if (response.status === 404 || !response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return null;
    }

    const item = data.product;

    const name = cleanProductTitle(
      cleanText(item.product_name_ja) ||
        cleanText(item.product_name) ||
        cleanText(item.product_name_en)
    );

    const brand = cleanText(item.brands);

    if (!name) {
      return null;
    }

    if (isGenericProductName(name) && !brand) {
      return null;
    }

    return {
      jan,
      name,
      brand,
      category: cleanCategory(item.categories),
      imageUrl:
        cleanText(item.image_front_url) ||
        cleanText(item.image_url),
      quantity: cleanText(item.quantity),
      productQuantity: item.product_quantity ?? null,
      seller: "",
      source: "Open Facts",
      sourceUrl: "",
    };
  } catch (error) {
    console.error("Open Facts 조회 오류:", error);
    return null;
  }
}

async function searchUpcItemDb(jan) {
  try {
    const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(
      jan
    )}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (
      response.status === 404 ||
      response.status === 429 ||
      !response.ok
    ) {
      return null;
    }

    const data = await response.json();

    const items = Array.isArray(data.items)
      ? data.items
      : [];

    if (items.length === 0) {
      return null;
    }

    const item = items[0];

    const name = cleanProductTitle(item.title);
    const brand = cleanText(item.brand);

    if (!name) {
      return null;
    }

    if (isGenericProductName(name) && !brand) {
      return null;
    }

    const imageUrl =
      Array.isArray(item.images) && item.images.length > 0
        ? cleanText(item.images[0])
        : "";

    return {
      jan,
      name,
      brand,
      category: cleanText(item.category),
      imageUrl,
      quantity: cleanText(item.weight),
      productQuantity: null,
      seller: "",
      source: "UPCitemdb",
      sourceUrl: "",
    };
  } catch (error) {
    console.error("UPCitemdb 조회 오류:", error);
    return null;
  }
}

async function finalizeProduct(product) {
  const originalName = cleanText(product.name);

  const translation = await translateToKorean(
    originalName
  );

  const nameKo =
    cleanText(translation.text) || originalName;

  const searchKeyword = buildKoreanSearchKeyword(
    nameKo,
    product.brand
  );

  return {
    ...product,
    name: nameKo,
    originalName,
    nameKo,
    searchKeyword,
    translated: translation.translated,
  };
}

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

  // 개발 중에는 이전 결과가 남지 않도록 캐시하지 않는다.
  res.setHeader("Cache-Control", "no-store");

  try {
    let product = null;

    product = await searchGoogleShoppingJapan(jan);

    if (!product) {
      product = await searchOpenFacts(jan);
    }

    if (!product) {
      product = await searchUpcItemDb(jan);
    }

    if (!product) {
      return res.status(200).json({
        found: false,
        jan,
      });
    }

    const finalProduct = await finalizeProduct(
      product
    );

    return res.status(200).json({
      found: true,
      product: finalProduct,
    });
  } catch (error) {
    console.error("상품 정보 조회 오류:", error);

    return res.status(500).json({
      error: "상품 정보 조회 중 오류가 발생했습니다.",
      detail:
        error instanceof Error
          ? error.message
          : "알 수 없는 오류",
    });
  }
}
