import fs from "fs";
import {
  getOrders,
  parseOrders,
  type OrderBulkResult,
  type Variant,
} from "./src/shopify/orders";
import { pollForBulkResult } from "./src/shopify/bulk";
import {
  COUNTRY_CODE,
  DATE_RANGE_STR,
  SALES_CHANNEL,
  SHOPIFY,
} from "./src/vars";
import { toCSV } from "./src/csv";
import _ from "lodash";

type VariantData = {
  id: string;
  product_id: string;
  g_id: string;
  title: string;
  price: number;
  type: string;
  qty: number;
  total: number;
};

type ProductTypeData = {
  name: string;
  qty: number;
  total: number;
  median: number;
  average: number;
  variants: Variant[];
};

async function main() {
  await pollForBulkResult<any>({});
  // const countryCodes = await getCountryCodes();
  // if (countryCodes.length !== 1) {
  //   throw new Error(
  //     `Expected 1 country code, got ${countryCodes.length}: ${countryCodes}`,
  //   );
  // }
  const countryCode = COUNTRY_CODE;

  const useCache = false;
  const lines = useCache
    ? await pollForBulkResult<OrderBulkResult>({})
    : await getOrders();
  const { orders } = parseOrders(lines);

  const line_items = Object.values(orders).flatMap((o) => o.lineItems);

  const vairant_dup_list: Variant[] = [];
  const variants = new Map<string, VariantData>();
  const product_types = new Map<string, ProductTypeData>();

  for (let i = 0; i < line_items.length; i++) {
    const line = line_items[i];
    const v = line.variant;
    const p = v.product;

    // product
    const variant_data = variants.get(line.variant.id) ?? {
      id: v.id,
      product_id: p.id,
      g_id: `shopify_${countryCode}_${p.id.split("/").pop()}_${v.id.split("/").pop()}`,
      title: p.title,
      type: p.productType,
      qty: 0,
      total: 0,
      price: v.price,
    };
    variant_data.qty += line.quantity;
    variant_data.total += v.price * line.quantity;

    variants.set(v.id, variant_data);

    // product type
    const type_data = product_types.get(p.productType) ?? {
      name: p.productType,
      qty: 0,
      total: 0,
      median: 0,
      average: 0,
      variants: [],
    };

    type_data.qty += line.quantity;
    type_data.total += v.price * line.quantity;

    for (let i = 0; i < line.quantity; i++) {
      type_data.variants.push(v);
      vairant_dup_list.push(v);
    }

    product_types.set(p.productType, type_data);
  }

  for (const type_name of product_types.keys()) {
    const type_data = product_types.get(type_name)!;
    const mid_index = Math.floor(type_data.variants.length / 2);
    type_data.median = type_data.variants[mid_index]?.price ?? 0;
    type_data.average = type_data.total / type_data.qty;
  }

  // const variant_list: Variant[] = vairant_dup_list.toSorted(
  //   (a, b) => a.price - b.price,
  // );
  // const variant_mid_index: number = Math.floor(variant_list.length / 2);
  // const variant_median: number = variant_list[variant_mid_index]?.price ?? 0;

  // const variant_average: number = variant_list.reduce(
  //   (total, p) => total + p.price,
  //   0,
  // );

  const types_data: ProductTypeData[] = Array.from(product_types.values()).sort(
    (a, b) => a.total - b.total,
  );

  // averages
  // const total_type_average_sum = types_data.reduce(
  //   (total, type) => total + type.average,
  //   0,
  // );
  const total_type_average =
    types_data.reduce((total, type) => total + type.total, 0) /
    types_data.length;

  const order_prices = Object.values(orders)
    .map((order) =>
      _.sumBy(order.lineItems, (li) => li.variant.price * li.quantity),
    )
    .toSorted((a, b) => a - b);

  const orders_total = _.sum(order_prices);

  const total_order_average = orders_total / order_prices.length;
  const total_order_median = order_prices[Math.floor(order_prices.length / 2)];

  // medians
  // const total_type_median_sum = types_data.reduce(
  //   (total, type) => total + type.median,
  //   0,
  // );

  const type_mid_index = Math.floor(types_data.length / 2);
  const total_type_median = types_data[type_mid_index].total;

  // csv

  // create out dir
  fs.mkdirSync("./out", { recursive: true });

  // NOTE: variants.csv
  fs.writeFileSync(
    `./out/${SHOPIFY.storeName}/variants${SALES_CHANNEL ? " " + SALES_CHANNEL : ""}_${DATE_RANGE_STR}.csv`,
    toCSV({
      keys: [
        "id",
        "product_id",
        "g_id",
        "title",
        "type",
        "qty",
        "total",
        "price",
      ],
      values: Array.from(variants.values()),
    }),
  );

  // NOTE: product_types.csv
  fs.writeFileSync(
    `./out/${SHOPIFY.storeName}/product_types${SALES_CHANNEL ? " " + SALES_CHANNEL : ""}_${DATE_RANGE_STR}.csv`,
    toCSV({
      keys: ["name", "qty", "total", "median", "average"],
      values: types_data,
    }),
  );

  // NOTE: stats.csv
  fs.writeFileSync(
    `out/${SHOPIFY.storeName}/stats${SALES_CHANNEL ? " " + SALES_CHANNEL : ""}_${DATE_RANGE_STR}.csv`,
    toCSV({
      values: [
        {
          total_order_average,
          total_order_median,
          total_type_average,
          total_type_median,
        },
      ],
      keys: [
        "total_order_average",
        "total_order_median",
        "total_type_average",
        "total_type_median",
      ],
    }),
  );
}
main();
