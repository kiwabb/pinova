export function formatPrice(priceFen: number) {
  return `¥${(priceFen / 100).toFixed(2)}`;
}
