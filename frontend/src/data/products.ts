export type TaxRate = 0.1 | 0.08;

export interface Product {
  jan: string;

  imageUrl?: string;

  nameJa?: string;
  nameKo?: string;

  brand?: string;

  /*
   * 한국 가격 검색용
   *
   * 너무 길게 쓰지 말고
   * 한국 쇼핑몰에서 실제로 검색될 만한
   * 핵심 상품명만 사용
   */
  searchKeyword?: string;

  /*
   * 고체 상품 중량
   */
  weightGram?: number;

  /*
   * 액체 용량
   *
   * 여행 제한 기능에서 사용 가능
   */
  volumeMl?: number;

  /*
   * 주류 도수
   *
   * 여행 제한 기능에서 사용 가능
   */
  alcoholPercent?: number;

  category: string;

  // 일본 소비세율
  taxRate: TaxRate;

  /*
   * 상품 종류 자체가
   * 면세 대상이 될 수 있는지
   */
  taxFreeEligible: boolean;

  // 화면 표시용
  taxCategory: string;

  // 주류 여부
  isAlcohol: boolean;
}

export const products: Product[] = [
  /*
   * =========================
   * 의약품
   * =========================
   */
  {
    jan: "4987241162031",

    nameJa:
      "ロートCキューブプレミアムモイスチャー 18mL",

    nameKo:
      "로토 C큐브 프리미엄 모이스처 18ml",

    brand: "ROHTO",

    searchKeyword:
      "로토 C큐브 프리미엄 모이스처 18ml",

    volumeMl: 18,

    category: "medicine",

    taxRate: 0.1,

    taxFreeEligible: true,

    taxCategory:
      "의약품 / 드럭스토어 상품",

    isAlcohol: false,
  },

  /*
   * =========================
   * 드럭스토어 / 생활용품
   * =========================
   */
  {
    jan: "4903301138525",

    nameJa:
      "休足時間 18枚",

    nameKo:
      "라이온 휴족시간 18매",

    brand: "LION",

    searchKeyword:
      "라이온 휴족시간 18매",

    category: "drugstore",

    taxRate: 0.1,

    taxFreeEligible: true,

    taxCategory:
      "생활 / 드럭스토어 상품",

    isAlcohol: false,
  },

  /*
   * =========================
   * 문구
   * =========================
   */
  {
    jan: "4901770056432",

    nameJa:
      "ちいかわ モノグラフ（ドリーム）",

    nameKo:
      "치이카와 모노그래프 드림 샤프 0.5mm",

    brand:
      "SUN-STAR",

    searchKeyword:
      "치이카와 모노그래프 드림 샤프 0.5mm",

    /*
     * 공식 상품 페이지 기준
     * 패키지 포함 약 26g
     */
    weightGram: 26,

    category:
      "stationery",

    taxRate: 0.1,

    taxFreeEligible: true,

    taxCategory:
      "문구류",

    isAlcohol: false,
  },

  /*
   * =========================
   * 피규어
   * =========================
   */
  {
    jan:
      "4573102694805",

    nameJa:
      "呪術廻戦 MAXIMATIC YUJI ITADORI-死滅回游-",

    nameKo:
      "주술회전 MAXIMATIC 이타도리 유지 사멸회유 피규어",

    brand:
      "BANDAI SPIRITS",

    searchKeyword:
      "주술회전 MAXIMATIC 이타도리 유지 사멸회유",

    category:
      "figure",

    imageUrl:
      "/images/itadori-maximatic.png",

    taxRate: 0.1,

    taxFreeEligible: true,

    taxCategory:
      "완구 / 피규어",

    isAlcohol: false,
  },

  /*
   * =========================
   * 식품
   *
   * 8% 세율 테스트용
   * =========================
   */
  {
    jan:
      "4901005009158",

    nameJa:
      "ポッキーチョコレート",

    nameKo:
      "글리코 포키 초콜릿",

    brand:
      "Glico",

    searchKeyword:
      "글리코 포키 초콜릿",

    /*
     * 29g × 2봉
     */
    weightGram: 58,

    category:
      "food",

    taxRate: 0.08,

    taxFreeEligible: true,

    taxCategory:
      "식품 / 과자 (경감세율 8%)",

    isAlcohol: false,
  },

  /*
   * =========================
   * 주류
   *
   * 500ml 액체 테스트용
   * =========================
   */
  {
    jan:
      "4901777451452",

    nameJa:
      "－196〈巨峰〉500ml缶",

    nameKo:
      "산토리 -196 거봉 500ml",

    brand:
      "SUNTORY",

    searchKeyword:
      "산토리 -196 거봉 500ml",

    volumeMl: 500,

    alcoholPercent: 5,

    category:
      "alcohol",

    taxRate: 0.1,

    taxFreeEligible: true,

    taxCategory:
      "주류 (소비세 10%)",

    isAlcohol: true,
  },

  /*
   * =========================
   * 고도수 주류
   *
   * 기내 / 위탁 모두 금지
   * 테스트용
   * =========================
   */
  {
    jan:
      "5900460001164",

    nameJa:
      "スピリタス 96° 500ml",

    nameKo:
      "스피리터스 96도 500ml",

    brand:
      "POLMOS",

    searchKeyword:
      "스피리터스 96도 500ml",

    volumeMl: 500,

    alcoholPercent: 96,

    category:
      "alcohol",

    taxRate: 0.1,

    taxFreeEligible: true,

    taxCategory:
      "주류 (소비세 10%)",

    isAlcohol: true,
  },
];