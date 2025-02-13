import { DATE_RANGE, SALES_CHANNEL } from "../vars";
import { bulkQuery, pollForBulkResult } from "./bulk";

export type Order = {
  id: string;
  createdAt: Date;
  channelInformation: ChannelInformation;
  lineItems: LineItem[];
};

export type ChannelInformation = {
  channelDefinition: { channelName: string };
  __parentId: string;
};

export type Price = { amount: string; currencyCode: string };

export type Product = {
  id: string;
  title: string;
  productType: string;
  brand?: string | null;
  metafield: { value: string } | null;
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
              createdAt
              channelInformation {
                channelDefinition {
                  channelName
                }
              }
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
                        metafield(key: "brand", namespace: "custom") {
                          value
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
  const orders: { [key: string]: Order } = {};
  for (const line of lines) {
    // order
    if (isOrder(line)) {
      line.lineItems = [];
      line.createdAt = new Date(line.createdAt);
      orders[line.id] = line;
    }
    // line item
    else if (isOrderLineItem(line) && line.variant !== null) {
      line.quantity ??= 0;
      line.variant.product.brand = line.variant.product.metafield?.value;
      orders[line.__parentId].lineItems.push(line);
    }
  }

  const oids = Object.keys(orders);
  for (const oid of oids) {
    const order = orders[oid]!;
    if (
      SALES_CHANNEL &&
      order?.channelInformation?.channelDefinition?.channelName !==
        SALES_CHANNEL
    ) {
      delete orders[oid];
    }
  }

  for (const oid of Object.keys(orders)) {
    const order = orders[oid];
    if (
      order.createdAt.getTime() < DATE_RANGE.start.getTime() ||
      order.createdAt.getTime() > DATE_RANGE.end.getTime()
    ) {
      delete orders[oid];
    }
  }

  return { orders };
}
