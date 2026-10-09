import React from 'react';
import { Product } from '../data/products';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', margin: '16px 0', backgroundColor: '#fff' }}>
      <p style={{ fontSize: '12px', color: '#666', margin: '0 0 4px 0' }}>{product.brand}</p>
      <h3 style={{ fontSize: '18px', margin: '0 0 8px 0' }}>{product.nameKo}</h3>
      <p style={{ fontSize: '14px', color: '#888', margin: '0 0 12px 0' }}>{product.nameJa}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
        <span>한국 판매가:</span>
        <strong style={{ color: '#0070f3' }}>{product.koreaPrice.toLocaleString()}원</strong>
      </div>
    </div>
  );
}
