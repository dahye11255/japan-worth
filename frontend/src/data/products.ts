export interface Product {
  jan: string;
  nameJa: string;
  nameKo: string;
  brand: string;
  koreaPrice: number;
  weightGram?: number;
  category?: string;
}

export const products: Product[] = [
  {
    jan: "4901234567890",
    nameJa: "ロートCキューブ",
    nameKo: "로토 C큐브(demo)",
    brand: "ROHTO",
    koreaPrice: 7900,
    weightGram: 13,
    category: "eye-care"
  },
  {
    jan: "4900000000001",
    nameJa: "休足時間",
    nameKo: "휴족시간(demo)",
    brand: "LION",
    koreaPrice: 8500,
    weightGram: 150,
    category: "body-care"
  }
];
