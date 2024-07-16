import fs from "fs";
import { getOrders, parseOrders, type Product } from "./src/shopify/orders";
import { pollForBulkResult } from "./src/shopify/bulk";

type ProductData = {
  id: string;
  title: string;
  type: string;
  price: number;
  qty: number;
  total: number;
};

type ProductTypeData = {
  name: string;
  qty: number;
  total: number;
  median: number;
  average: number;
  products: Product[];
};

async function main() {
  await pollForBulkResult<any>({});
  // const lines = await pollForBulkResult<OrderBulkResult>({});
  const lines = await getOrders();
  const { line_items } = parseOrders(lines);

  const product_dup_list: Product[] = [];
  const products = new Map<string, ProductData>();
  const product_types = new Map<string, ProductTypeData>();

  for (let i = 0; i < line_items.length; i++) {
    const line = line_items[i];
    process.stdout.write(`\r${i}/${line_items.length}`);
    const product = line.product;

    // product
    const product_data = products.get(product.id) ?? {
      id: product.id,
      title: product.title,
      type: product.productType,
      qty: 0,
      total: 0,
      price: product.price,
    };
    console.log(product_data);
    product_data.qty += line.quantity;
    product_data.total += product.price * line.quantity;
    console.log(product_data);

    products.set(product.id, product_data);

    // product type
    const type_data = product_types.get(product.productType) ?? {
      name: product.productType,
      qty: 0,
      total: 0,
      median: 0,
      average: 0,
      products: [],
    };

    type_data.qty += line.quantity;
    type_data.total += product.price * line.quantity;
    for (let i = 0; i < line.quantity; i++) {
      type_data.products.push(product);

      product_dup_list.push(product);
    }

    product_types.set(product.id, type_data);
  }

  for (const type_name of product_types.keys()) {
    const type_data = product_types.get(type_name)!;
    const mid_index = Math.floor(type_data.products.length / 2);
    type_data.median = type_data.products[mid_index]?.price ?? 0;
    type_data.average = type_data.total / type_data.qty;
  }

  const product_list: Product[] = product_dup_list.toSorted(
    (a, b) => a.price - b.price,
  );
  const prod_mid_index: number = Math.floor(product_list.length / 2);
  const prod_median: number = product_list[prod_mid_index]?.price ?? 0;

  const prod_average: number = product_list.reduce(
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

  // NOTE: products.csv
  fs.writeFileSync(
    "./out/products.csv",
    toCSV({
      keys: ["id", "title", "type", "qty", "total", "price"],
      values: Array.from(products.values()),
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
