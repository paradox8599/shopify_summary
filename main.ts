import fs from "fs";
import {
  getOrders,
  parseOrders,
  type OrderBulkResult,
  type Variant,
} from "./src/shopify/orders";
import { pollForBulkResult } from "./src/shopify/bulk";

type VariantData = {
  id: string;
  product_id: string;
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
  const useCache = true;
  const lines = useCache
    ? await pollForBulkResult<OrderBulkResult>({})
    : await getOrders();
  const { line_items } = parseOrders(lines);

  const vairant_dup_list: Variant[] = [];
  const variants = new Map<string, VariantData>();
  const product_types = new Map<string, ProductTypeData>();

  for (let i = 0; i < line_items.length; i++) {
    const line = line_items[i];
    process.stdout.write(`\r${i}/${line_items.length}`);
    const v = line.variant;
    const p = v.product;

    // product
    const variant_data = variants.get(line.variant.id) ?? {
      id: v.id,
      product_id: p.id,
      title: p.title,
      type: p.productType,
      qty: 0,
      total: 0,
      price: v.price,
    };
    console.log(variant_data);
    variant_data.qty += line.quantity;
    variant_data.total += v.price * line.quantity;
    console.log(variant_data);

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

    product_types.set(p.id, type_data);
  }

  for (const type_name of product_types.keys()) {
    const type_data = product_types.get(type_name)!;
    const mid_index = Math.floor(type_data.variants.length / 2);
    type_data.median = type_data.variants[mid_index]?.price ?? 0;
    type_data.average = type_data.total / type_data.qty;
  }

  const variant_list: Variant[] = vairant_dup_list.toSorted(
    (a, b) => a.price - b.price,
  );
  const prod_mid_index: number = Math.floor(variant_list.length / 2);
  const variant_median: number = variant_list[prod_mid_index]?.price ?? 0;

  const variant_average: number = variant_list.reduce(
    (total, p) => total + p.price,
    0,
  );

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
    "./out/variants.csv",
    toCSV({
      keys: ["id", "product_id", "title", "type", "qty", "total", "price"],
      values: Array.from(variants.values()),
    }),
  );

  // NOTE: product_types.csv
  fs.writeFileSync(
    "./out/product_types.csv",
    toCSV({
      keys: ["name", "qty", "total", "median", "average"],
      values: types_data,
    }),
  );

  // NOTE: stats.csv
  fs.writeFileSync(
    "out/stats.csv",
    toCSV({
      values: [
        {
          // total_type_average_sum: total_type_average_sum,
          total_type_average: total_type_average,
          // total_type_median_sum: total_type_median_sum,
          total_type_median: total_type_median,
        },
      ],
      keys: [
        // "total_type_average_sum",
        "total_type_average",
        // "total_type_median_sum",
        "total_type_median",
      ],
    }),
  );
}
main();

function toCSV({
  keys,
  values,
}: {
  keys: string[];
  values: { [key: string]: any }[];
}) {
  const csv = [keys.join(",")];
  for (const value of values) {
    const row = [];
    for (const key of keys) {
      let val = value[key];
      switch (typeof val) {
        case "string":
          val = val.replace(/"/g, '"');
          val = `"${val}"`;
          break;
        case "number":
          val = Number.parseFloat(val.toFixed(2));
      }
      row.push(val);
    }
    csv.push(row.join(","));
  }
  return csv.join("\n");
}
