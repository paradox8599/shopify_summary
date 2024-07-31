import fs from "fs";
import { bulkQuery, pollForBulkResult } from "./bulk";

export type Order = { id: string; lineItem: LineItem[] };

export type Price = { amount: string; currencyCode: string };

export type Product = {
  id: string;
  title: string;
  productType: string;
};

export type Variant = {
  id: string;
  price: number;
  product: Product;
};

export type LineItem = {
  id: string;
  quantity: number;
  unfulfilledOriginalTotalSet: { presentmentMoney: Price; shopMoney: Price };
  variant: Variant;
  __parentId: string;
};

export type OrderBulkResult = Order | LineItem;

function isOrderLineItem(line: OrderBulkResult): line is LineItem {
  return "variant" in line;
}

function isOrder(line: OrderBulkResult): line is Order {
  return !isOrderLineItem(line);
}

export async function getOrders() {
  await bulkQuery({
    query: /* GraphQL */ `
      query Orders {
        orders {
          edges {
            node {
              id
              lineItems {
                edges {
                  node {
                    id
                    quantity
                    unfulfilledOriginalTotalSet {
                      presentmentMoney {
                        amount
                        currencyCode
                      }
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    variant {
                      id
                      price
                      product {
                        id
                        title
                        productType
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `,
  });

  let lines = await pollForBulkResult<OrderBulkResult>({});
  return lines;
}

export function parseOrders(lines: OrderBulkResult[]) {
  const orders = lines.filter(isOrder);
  const orders_obj = Object.fromEntries(orders.map((o) => [o.id, o]));
  debugger;

  const line_items = lines
    .filter(isOrderLineItem)
    .map((l) => ({
      ...l,
      quantity: l.quantity ?? 0,
    }))
    .filter((l) => l.variant !== null);

  // variants
  const variants = line_items.map((l) => l.variant);

  for (const line of line_items) {
    const order = orders_obj[line.__parentId];
    if (!order.lineItem) order.lineItem = [];
    order.lineItem.push(line);
  }

  return { orders, orders_obj, line_items, products: variants };
}
