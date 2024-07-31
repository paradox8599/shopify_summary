export const SHOPIFY = {
  storeName: process.env.SHOPIFY_STORE_NAME!,
  adminToken: process.env.SHOPIFY_ADMIN_TOKEN!,
};

export const SHOPIFY_API = `https://${SHOPIFY.storeName}.myshopify.com/admin/api/2024-04/graphql.json`;

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
