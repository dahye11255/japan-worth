
export type TaxRate = 0.1 | 0.08;

export interface Product {
  jan: string;

  imageUrl?: string;

  nameJa?: string;
  nameKo?: string;

  brand?: string;
  searchKeyword?: string;

  // 고체 상품 중량 (g)
  weightGram?: number;

  // 액체 용량 (mL)
  volumeMl?: number;

  // 알코올 도수 (%)
  alcoholPercent?: number;

  category: string;

  // 일본 소비세율
  taxRate: TaxRate;

  // 상품 종류상 소비세 면세 대상이 될 수 있는지
  taxFreeEligible: boolean;

  // 화면 표시용 분류
  taxCategory: string;

  // 주류 여부
  isAlcohol: boolean;
}

export const products: Product[] = [
  // =====================================
  // 1. 의약품 / 드럭스토어
  // =====================================

  {
    jan: "4987241162031",
    nameJa: "ロートCキューブプレミアムモイスチャー 18mL",
    nameKo: "로토 C큐브 프리미엄 모이스처 18ml",
    brand: "ROHTO",
    searchKeyword: "로토 C큐브 프리미엄 모이스처 18ml",

    // 팀원 이미지: 프리미엄 모이스처 제품인지 확인 필요
    imageUrl: "/images/rohto-c-cube.jpg",

    volumeMl: 18,
    category: "medicine",

    taxRate: 0.1,
    taxFreeEligible: true,
    taxCategory: "의약품 / 드럭스토어 상품",
    isAlcohol: false,
  },

  {
    jan: "4903301138525",
    nameJa: "休足時間 18枚",
    nameKo: "라이온 휴족시간 18매",
    brand: "LION",
    searchKeyword: "라이온 휴족시간 18매",

    imageUrl: "/images/kyusoku-jikan.jpg",

    category: "drugstore",

    taxRate: 0.1,
    taxFreeEligible: true,
    taxCategory: "생활 / 드럭스토어 상품",
    isAlcohol: false,
  },

  // =====================================
  // 2. 문구류
  // =====================================

  {
    jan: "4901770056432",
    nameJa: "ちいかわ モノグラフ（ドリーム）",
    nameKo: "치이카와 모노그래프 드림 샤프 0.5mm",
    brand: "SUN-STAR",
    searchKeyword: "치이카와 모노그래프 드림 샤프 0.5mm",

    imageUrl: "/images/mono-graph-dream-05.jpg",

    weightGram: 26,
    category: "stationery",

    taxRate: 0.1,
    taxFreeEligible: true,
    taxCategory: "문구류",
    isAlcohol: false,
  },

  // =====================================
  // 3. 피규어 / 완구
  // =====================================

  {
    jan: "4573102694805",
    nameJa: "呪術廻戦 MAXIMATIC YUJI ITADORI-死滅回游-",
    nameKo: "주술회전 MAXIMATIC 이타도리 유지 사멸회유 피규어",
    brand: "BANDAI SPIRITS",
    searchKeyword: "주술회전 MAXIMATIC 이타도리 유지 사멸회유",

    // 메인 코드의 기존 이미지 유지
    imageUrl: "/images/itadori-maximatic.png",

    category: "figure",

    taxRate: 0.1,
    taxFreeEligible: true,
    taxCategory: "완구 / 피규어",
    isAlcohol: false,
  },

  {
    jan: "4573102695185",
    nameJa: "ワンピース Grandista-RORONOA ZORO II",
    nameKo: "원피스 반프레스토 그란디스타 롤로노아 조로 2",
    brand: "BANDAI SPIRITS",
    searchKeyword: "원피스 그란디스타 롤로노아 조로 II",

    imageUrl: "/images/zoro-grandista-ii.jpg",

    category: "figure",

    taxRate: 0.1,
    taxFreeEligible: true,
    taxCategory: "완구 / 피규어",
    isAlcohol: false,
  },

  // =====================================
  // 4. 화장품 / 뷰티
  // =====================================

  {
    jan: "4515061089599",
    nameJa: "ツルリ 毛穴汚れ分解ジェル 15g",
    nameKo: "츠루리 모공 클렌징 젤 15g",
    brand: "BCL",
    searchKeyword: "BCL 츠루리 모공 클렌징 젤 15g",

    imageUrl: "/images/tsururi-gel.jpg",

    weightGram: 15,
    category: "beauty",

    taxRate: 0.1,
    taxFreeEligible: true,
    taxCategory: "화장품",
    isAlcohol: false,
  },

  {
    jan: "4987241105052",
    nameJa: "メンソレータム 薬用リップスティックXD 4g",
    nameKo: "멘소래담 약용 립스틱 XD 4g",
    brand: "ROHTO",
    searchKeyword: "멘소래담 약용 립스틱 XD 4g",

    weightGram: 4,
    category: "beauty",

    taxRate: 0.1,
    taxFreeEligible: true,
    taxCategory: "의약외품",
    isAlcohol: false,
  },

  {
    jan: "4589546893308",
    nameJa: "アンドハニー ディープモイスト ヘアオイル3.0 つめかえ 75ml",
    nameKo: "앤드허니 딥모이스트 헤어오일 3.0 리필 75ml",
    brand: "&honey",
    searchKeyword: "앤드허니 딥모이스트 헤어오일 3.0 리필 75ml",

    // 리필 파우치 이미지인지 확인 필요
    imageUrl: "/images/andhoney-hair-oil.jpg",

    volumeMl: 75,
    category: "beauty",

    taxRate: 0.1,
    taxFreeEligible: true,
    taxCategory: "화장품",
    isAlcohol: false,
  },

  // =====================================
  // 5. 식품 - 소비세 8%
  // =====================================

  {
    jan: "4901005009158",
    nameJa: "ポッキーチョコレート",
    nameKo: "글리코 포키 초콜릿",
    brand: "Glico",
    searchKeyword: "글리코 포키 초콜릿",

    weightGram: 58,
    category: "food",

    taxRate: 0.08,
    taxFreeEligible: true,
    taxCategory: "식품 / 과자 (경감세율 8%)",
    isAlcohol: false,
  },

  // =====================================
  // 6. 주류 - 소비세 10%
  // =====================================

  {
    jan: "4901777451452",
    nameJa: "－196〈巨峰〉500ml缶",
    nameKo: "산토리 -196 거봉 500ml",
    brand: "SUNTORY",
    searchKeyword: "산토리 -196 거봉 500ml",

    volumeMl: 500,
    alcoholPercent: 5,
    category: "alcohol",

    taxRate: 0.1,
    taxFreeEligible: true,
    taxCategory: "주류 (소비세 10%)",
    isAlcohol: true,
  },

  {
    jan: "5900460001164",
    nameJa: "スピリタス 96° 500ml",
    nameKo: "스피리터스 96도 500ml",
    brand: "POLMOS",
    searchKeyword: "스피리터스 96도 500ml",

    volumeMl: 500,
    alcoholPercent: 96,
    category: "alcohol",

    taxRate: 0.1,
    taxFreeEligible: true,
    taxCategory: "주류 (소비세 10%)",
    isAlcohol: true,
  },
];
