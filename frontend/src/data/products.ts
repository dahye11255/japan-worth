export type TaxRate = 0.1 | 0.08;

export interface Product {
  jan: string;

  nameJa?: string;
  nameKo?: string;

  brand?: string;
  searchKeyword?: string;

  weightGram?: number;
  category: string;

  // 소비세율
  taxRate: TaxRate;

  // 상품 종류 자체가 면세 대상이 될 수 있는지
  taxFreeEligible: boolean;

  // 화면 표시용 설명
  taxCategory: string;

  // 주류 여부
  isAlcohol: boolean;
}

export const products: Product[] = [
  {
    jan: "4901234567890",
    nameJa: "ロートCキューブ",
    nameKo: "로토 C큐브",
    brand: "ROHTO",
    searchKeyword: "로토 C 큐브",

    weightGram: 20,

    category: "medicine",

    taxRate: 0.1,
    taxFreeEligible: true,
    taxCategory: "의약품 / 드럭스토어 상품",

    isAlcohol: false,
  },

  {
    jan: "4900000000001",
    nameJa: "休足時間",
    nameKo: "휴족시간",
    brand: "LION",
    searchKeyword: "휴족시간",

    weightGram: 20,

    category: "drugstore",

    taxRate: 0.1,
    taxFreeEligible: true,
    taxCategory: "생활 / 드럭스토어 상품",

    isAlcohol: false,
  },

  {
    jan: "4901770056432",
    nameJa: "MONO graph ちいかわ ドリーム",
    nameKo: "모노그래프 치이카와 드림 샤프 0.5mm",
    brand: "TOMBOW",
    searchKeyword:
      "TOMBOW 모노그래프 치이카와 드림 0.5mm",

    weightGram: 20,

    category: "stationery",

    taxRate: 0.1,
    taxFreeEligible: true,
    taxCategory: "문구류",

    isAlcohol: false,
  },

  {
    jan: "4573102694805",
    nameKo: "주술회전 이타도리 피규어",
    nameJa: "itadori",
    brand: "BANDAI",
    searchKeyword:
      "주술회전 이타도리 피규어",

    weightGram: 20,

    category: "figure",

    taxRate: 0.1,
    taxFreeEligible: true,
    taxCategory: "완구 / 피규어",

    isAlcohol: false,
  },
];
