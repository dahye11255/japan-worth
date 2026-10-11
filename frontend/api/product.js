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

  try {
    const response = await fetch(
      "https://api.upcitemdb.com/prod/trial/lookup",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        body: JSON.stringify({
          upc: jan,
        }),
      }
    );

    const rawText =
      await response.text();

    let data;

    try {
      data = JSON.parse(rawText);
    } catch {
      return res.status(502).json({
        error:
          "상품 데이터 응답을 읽지 못했습니다.",
      });
    }

    /*
     * 무료 API 요청 제한
     */
    if (response.status === 429) {
      return res.status(429).json({
        error:
          "상품 조회 횟수 제한에 도달했습니다. 잠시 후 다시 시도해주세요.",
      });
    }

    /*
     * 상품 없음
     */
    const items =
      Array.isArray(data.items)
        ? data.items
        : [];

    if (
      response.status === 404 ||
      items.length === 0
    ) {
      return res.status(200).json({
        found: false,
        jan,
      });
    }

    if (!response.ok) {
      return res.status(502).json({
        error:
          "외부 상품 DB 조회에 실패했습니다.",
        status: response.status,
      });
    }

    const item = items[0];

    /*
     * JapanWorth에서 필요한 정보만 정리
     */
    const product = {
      jan,

      name:
        item.title ??
        "상품명 없음",

      brand:
        item.brand ??
        "",

      category:
        item.category ??
        "",

      description:
        item.description ??
        "",

      imageUrl:
        Array.isArray(
          item.images
        ) &&
        item.images.length > 0
          ? item.images[0]
          : "",

      weight:
        item.weight ??
        "",

      source:
        "UPCitemdb",
    };

    return res.status(200).json({
      found: true,
      product,
    });
  } catch (error) {
    console.error(
      "상품 정보 조회 오류:",
      error
    );

    return res.status(500).json({
      error:
        "상품 정보 조회 중 오류가 발생했습니다.",

      detail:
        error instanceof Error
          ? error.message
          : "알 수 없는 오류",
    });
  }
}