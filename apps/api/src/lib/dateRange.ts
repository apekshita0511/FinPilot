/** [from, to) — `to` is the first instant of the following month, exclusive. */
export function monthRange(year: number, month: number) {
  return {
    from: new Date(Date.UTC(year, month - 1, 1)),
    to: new Date(Date.UTC(year, month, 1)),
  };
}

/** Defaults to the server's current UTC year/month when not provided. */
export function resolveMonth(query: { year?: number; month?: number }) {
  const now = new Date();
  return {
    year: query.year ?? now.getUTCFullYear(),
    month: query.month ?? now.getUTCMonth() + 1,
  };
}
