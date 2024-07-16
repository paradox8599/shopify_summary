import { bulkQuery, pollForBulkResult } from "./bulk";

export type Order = { id: string; lineItem: LineItem[] };

export type Price = { amount: string; currencyCode: string };

export type Product = {
  id: string;
  title: string;
  productType: string;
  price: number;
  compareAtPriceRange: {
    maxVariantCompareAtPrice: Price;
    minVariantCompareAtPrice: Price;
  };
  priceRangeV2: {
    maxVariantPrice: Price;
    minVariantPrice: Price;
  };
};

export type LineItem = {
  id: string;
  quantity: number;
  unfulfilledOriginalTotalSet: { presentmentMoney: Price; shopMoney: Price };
  product: Product;
  __parentId: string;
};

export type OrderBulkResult = Order | LineItem;

function isOrderLineItem(line: OrderBulkResult): line is LineItem {
  return "product" in line;
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
                    product {
                      id
                      title
                      productType
                      compareAtPriceRange {
                        maxVariantCompareAtPrice {
                          amount
                          currencyCode
                        }
                        minVariantCompareAtPrice {
                          amount
                          currencyCode
                        }
                      }
                      priceRangeV2 {
                        maxVariantPrice {
                          amount
                          currencyCode
                        }
                        minVariantPrice {
                          amount
                          currencyCode
                        }
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
    .filter((l) => l.product !== null);
  // products
  const products = line_items.map((l) => l.product) as Product[];

  products.forEach((p: Product) => {
    p.price = Number.parseFloat(p.priceRangeV2.maxVariantPrice.amount);
  });

  for (const line of line_items) {
    const order = orders_obj[line.__parentId];
    if (!order.lineItem) order.lineItem = [];
    order.lineItem.push(line);
  }

  return { orders, orders_obj, line_items, products };
}
