function parse(s: string | undefined) {
  return s?.startsWith('"') ? JSON.parse(s ?? "") : (s ?? "");
}
export const SHOPIFY = {
  storeName: parse(process.env.SHOPIFY_STORE_NAME),
  adminToken: parse(process.env.SHOPIFY_ADMIN_TOKEN),
};

export const SHOPIFY_API = `https://${parse(
  SHOPIFY.storeName,
)}.myshopify.com/admin/api/2024-04/graphql.json`;

export const CACHE = {
  dir: process.env.CACHE_DIR ?? "./cache",
  date: ([void 0, ""].includes(process.env.CACHE_DATE)
    ? undefined
    : new Date(process.env.CACHE_DATE as string)) as Date | undefined,
};

export const DEV = process.env.NODE_ENV === "dev";

export enum Emoji {
  time = "⏱️ ",
  src = "🟡",
  dst = "🟢",
  fetch = "🔎",
  error = "❌",
  done = "✅",
  stats = "📊",
  thinking = "🤔",
  writing = "✏️",
}

export const verbose = true;
