# JapanWorth

일본 여행 중 상품 바코드를 스캔해
일본 현지 가격과 한국 구매 가격을 비교하고,
면세·쿠폰·수하물 등을 고려해 구매 여부를 판단해주는 웹앱입니다.

## MVP

- JAN 바코드 스캔
- 일본 상품 식별
- 엔화 → 원화 환산
- 한국 가격 비교
- 면세 계산
- 장바구니 기능

## Tech Stack

- React
- TypeScript
- Vite
- ZXing
- FastAPI
- PostgreSQL / Supabase

## Service Flow

```mermaid
flowchart LR
    A[바코드 스캔] --> B[JAN 코드 인식]
    B --> C[상품 정보 조회]
    C --> D[일본 가격 입력]
    D --> E[원화 환산]
    E --> F[한국 가격 비교]
    F --> G[구매 추천]
    G --> H[장바구니]
```
