import dayjs from "dayjs";

export const SHOPIFY = {
  storeName: process.env.SHOPIFY_STORE_NAME!,
  adminToken: process.env.SHOPIFY_ADMIN_TOKEN!,
};

export const SHOPIFY_API = `https://${SHOPIFY.storeName}.myshopify.com/admin/api/2024-04/graphql.json`;

export const DEV = process.env.NODE_ENV === "dev";
export const COUNTRY_CODE = process.env.COUNTRY_CODE || "AU";
export const SALES_CHANNEL = process.env.SALES_CHANNEL;
export const DATE_RANGE = {
  start: process.env.FILTER_START_DATE
    ? new Date(process.env.FILTER_START_DATE)
    : new Date(0),
  end: process.env.FILTER_END_DATE
    ? new Date(process.env.FILTER_END_DATE)
    : new Date(),
};
export const DATE_RANGE_STR = `${dayjs(DATE_RANGE.start).format("YYYY-MM-DD")}-${dayjs(DATE_RANGE.end).format("YYYY-MM-DD")}`;

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

export const verbose = false;
