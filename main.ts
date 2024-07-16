import fs from "fs";
import { getOrders } from "./src/shopify/orders";
import { pollForBulkResult } from "./src/shopify/bulk";

async function main() {
  // await pollForBulkResult({});
  // const orders = await getOrders();
  let orders_bulk_data = JSON.parse(
    fs.readFileSync("./bulk_orders.json").toString(),
  );

  orders_bulk_data = orders_bulk_data
    .filter((l: any) => l.product)
    .splice(0, 10);
  for (const line of orders_bulk_data) {
    console.log(line);
    console.log("--------------------------------");
  }
  // fs.writeFileSync("./bulk_orders.json", JSON.stringify(orders));
}
main();
