export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "GET 요청만 가능합니다.",
    });
  }

  const query =
    typeof req.query?.query === "string"
      ? req.query.query
      : "";

  if (!query) {
    return res.status(400).json({
      error: "검색어가 필요합니다.",
    });
  }

  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "SERPAPI_API_KEY가 설정되지 않았습니다.",
    });
  }

  try {
    const params = new URLSearchParams({
      engine: "google_shopping",
      q: query,
      gl: "kr",
      hl: "ko",
      api_key: apiKey,
    });

    const serpResponse = await fetch(
      `https://serpapi.com/search.json?${params.toString()}`
    );

    const rawText = await serpResponse.text();

    let data;

    try {
      data = JSON.parse(rawText);
    } catch {
      return res.status(502).json({
        error: "SerpApi 응답을 JSON으로 읽지 못했습니다.",
        serpStatus: serpResponse.status,
        response: rawText.slice(0, 500),
      });
    }

    if (!serpResponse.ok || data.error) {
      return res.status(502).json({
        error: "SerpApi 요청에 실패했습니다.",
        serpStatus: serpResponse.status,
        serpError: data.error ?? "알 수 없는 오류",
      });
    }

    const shoppingResults = Array.isArray(
      data.shopping_results
    )
      ? data.shopping_results
      : [];

    const results = shoppingResults
      .filter((item) => {
        return (
          typeof item.extracted_price === "number" &&
          Number.isFinite(item.extracted_price) &&
          item.extracted_price > 0
        );
      })
      .slice(0, 5)
      .map((item) => ({
        title: item.title ?? "상품명 없음",

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

    return res.status(200).json({
      query,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error(
      "Google Shopping 검색 오류:",
      error
    );

    return res.status(500).json({
      error: "한국 판매가 검색에 실패했습니다.",
      detail:
        error instanceof Error
          ? error.message
          : "알 수 없는 서버 오류",
    });
  }
}