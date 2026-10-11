export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "GET 요청만 가능합니다.",
    });
  }

  const url = new URL(
    req.url,
    `https://${req.headers.host}`
  );

  const query = url.searchParams.get("query");

  if (!query) {
    return res.status(400).json({
      error: "검색어가 필요합니다.",
    });
  }

  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "SerpApi API Key가 설정되지 않았습니다.",
    });
  }

  try {
    const params = new URLSearchParams({
      engine: "google_shopping",
      q: query,
      gl: "kr",
      hl: "ko",
      location: "Seoul, South Korea",
      api_key: apiKey,
    });

    const response = await fetch(
      `https://serpapi.com/search.json?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(
        `SerpApi 요청 실패: ${response.status}`
      );
    }

    const data = await response.json();

    const results = (data.shopping_results ?? [])
      .filter(
        (item) =>
          typeof item.extracted_price === "number" &&
          item.extracted_price > 0
      )
      .slice(0, 5)
      .map((item) => ({
        title: item.title,
        source: item.source ?? "판매처 정보 없음",

        price: item.price,
        extractedPrice: item.extracted_price,

        link:
          item.product_link ??
          item.link ??
          "",

        thumbnail:
          item.thumbnail ?? "",
      }));

    return res.status(200).json({
      results,
    });
  } catch (error) {
    console.error("Google Shopping 검색 오류:", error);

    return res.status(500).json({
      error: "한국 판매가 검색에 실패했습니다.",
    });
  }
}