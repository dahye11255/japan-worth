export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "GET 요청만 가능합니다.",
    });
  }

  const query =
    typeof req.query?.query === "string"
      ? req.query.query.trim()
      : "";

  const jan =
    typeof req.query?.jan === "string"
      ? req.query.jan.trim()
      : "";

  if (!query && !jan) {
    return res.status(400).json({
      error: "상품명 또는 JAN 코드가 필요합니다.",
    });
  }

  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "SERPAPI_API_KEY가 설정되지 않았습니다.",
    });
  }

  /*
   * SerpApi 공통 호출
   */
  const callSerpApi = async (paramsObject) => {
    const params = new URLSearchParams({
      ...paramsObject,
      gl: "kr",
      hl: "ko",
      api_key: apiKey,
    });

    const response = await fetch(
      `https://serpapi.com/search.json?${params.toString()}`
    );

    const rawText = await response.text();

    let data;

    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(
        `SerpApi 응답 JSON 변환 실패 (${response.status})`
      );
    }

    if (!response.ok || data.error) {
      throw new Error(
        data.error ??
          `SerpApi 요청 실패 (${response.status})`
      );
    }

    return data;
  };

  /*
   * Google Shopping 결과 정리
   */
  const normalizeShoppingResults = (data) => {
    const shoppingResults = Array.isArray(
      data.shopping_results
    )
      ? data.shopping_results
      : [];

    return shoppingResults
      .filter((item) => {
        return (
          typeof item.extracted_price === "number" &&
          Number.isFinite(item.extracted_price) &&
          item.extracted_price > 0
        );
      })
      .map((item) => ({
        title:
          item.title ??
          "상품명 없음",

        source:
          item.source ??
          item.merchant ??
          "판매처 정보 없음",

        price:
          item.price ?? "",

        extractedPrice:
          item.extracted_price,

        link:
          item.product_link ??
          item.link ??
          "",

        thumbnail:
          item.thumbnail ?? "",
      }));
  };

  /*
   * 같은 상품 중복 제거
   */
  const removeDuplicates = (items) => {
    const seen = new Set();

    return items.filter((item) => {
      const key =
        `${item.title}-${item.source}-${item.extractedPrice}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  };

  try {
    /*
     * 1단계
     * JAN 코드로 Google Shopping 검색
     */
    let results = [];

    if (jan) {
      try {
        const janData =
          await callSerpApi({
            engine:
              "google_shopping",
            q: jan,
          });

        results =
          normalizeShoppingResults(
            janData
          );
      } catch (error) {
        console.error(
          "JAN Shopping 검색 오류:",
          error
        );
      }
    }

    /*
     * 2단계
     * JAN으로 못 찾았으면 상품명 검색
     */
    if (
      results.length === 0 &&
      query
    ) {
      try {
        const queryData =
          await callSerpApi({
            engine:
              "google_shopping",
            q: query,
          });

        results =
          normalizeShoppingResults(
            queryData
          );
      } catch (error) {
        console.error(
          "상품명 Shopping 검색 오류:",
          error
        );
      }
    }

    results = removeDuplicates(
      results
    ).slice(0, 5);

    /*
     * Shopping에서 상품을 찾았다면
     * 자동 가격 비교용 데이터 반환
     */
    if (results.length > 0) {
      return res.status(200).json({
        query,
        jan,

        searchMode:
          "shopping",

        count:
          results.length,

        results,

        webResults: [],
      });
    }

    /*
     * 3단계
     * Google Shopping에서도 못 찾으면
     * 일반 Google 검색으로 한국 판매처 탐색
     *
     * 여기서는 가격을 임의로 추출하지 않는다.
     */
    const webQueryParts = [];

    if (jan) {
      webQueryParts.push(
        `"${jan}"`
      );
    }

    if (query) {
      webQueryParts.push(
        `"${query}"`
      );
    }

    const webQuery =
      `${webQueryParts.join(
        " "
      )} ` +
      `(site:coupang.com OR ` +
      `site:smartstore.naver.com OR ` +
      `site:11st.co.kr OR ` +
      `site:gmarket.co.kr OR ` +
      `site:auction.co.kr)`;

    let webResults = [];

    try {
      const webData =
        await callSerpApi({
          engine: "google",
          q: webQuery,
        });

      const organicResults =
        Array.isArray(
          webData.organic_results
        )
          ? webData.organic_results
          : [];

      webResults =
        organicResults
          .slice(0, 5)
          .map((item) => ({
            title:
              item.title ??
              "상품 페이지",

            link:
              item.link ?? "",

            snippet:
              item.snippet ?? "",

            source:
              item.source ??
              item.displayed_link ??
              "",
          }))
          .filter(
            (item) =>
              item.link
          );
    } catch (error) {
      console.error(
        "일반 Google 검색 오류:",
        error
      );
    }

    return res.status(200).json({
      query,
      jan,

      searchMode:
        webResults.length > 0
          ? "web-fallback"
          : "none",

      count: 0,

      results: [],

      webResults,
    });
  } catch (error) {
    console.error(
      "한국 상품 검색 오류:",
      error
    );

    return res.status(500).json({
      error:
        "한국 판매가 검색에 실패했습니다.",

      detail:
        error instanceof Error
          ? error.message
          : "알 수 없는 서버 오류",
    });
  }
}