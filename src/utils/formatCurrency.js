export function formatCurrency(amount) {
  const value = Number(amount) || 0;
  return `PKR ${value.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}
