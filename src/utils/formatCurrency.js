function formatAmount(value) {
  return (Number(value) || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export function formatPKR(value) {
  return `PKR ${formatAmount(value)}`;
}

export function formatApproxPKR(value) {
  return `~ ${formatPKR(value)}`;
}

// Keep the existing name for non-results consumers while using the same
// presentation formatter everywhere.
export const formatCurrency = formatPKR;
