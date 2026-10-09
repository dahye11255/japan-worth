export const products = [
  {
    jan: '4901234567890',
    nameJa: 'ロートCキューブ',
    nameKo: '로토 C큐브',
    brand: 'ROHTO',
    koreaPrice: 7900,
    weightGram: 13,
  },
  {
    jan: '4900000000001',
    nameJa: '休足時間',
    nameKo: '휴족시간',
    brand: 'LION',
    koreaPrice: 8500,
    weightGram: 150,
  },
]
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
    jan: "4901234567890", // [DEMO/예시/검증 필요] 발표용 임시 JAN 코드 1
    nameJa: "サンプル商品 A",
    nameKo: "샘플 상품 A (DEMO)",
    brand: "테스트브랜드",
    koreaPrice: 12900,
    weightGram: 30,
    category: "medicine"
  },
  {
    jan: "4909876543210", // [DEMO/예시/검증 필요] 발표용 임시 JAN 코드 2
    nameJa: "サンプル商品 B",
    nameKo: "샘플 상품 B (DEMO)",
    brand: "테스트브랜드",
    koreaPrice: 8500,
    weightGram: 15,
    category: "cosmetics"
  }
];
