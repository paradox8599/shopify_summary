import { SALES_CHANNEL } from "../vars";
import { bulkQuery, pollForBulkResult } from "./bulk";

export type Order = {
  id: string;
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
  debugger;
  for (const line of lines) {
    // order
    if (isOrder(line)) {
      line.lineItems = [];
      orders[line.id] = line;
    }
    // line item
    else if (isOrderLineItem(line) && line.variant !== null) {
      line.quantity ??= 0;
      orders[line.__parentId].lineItems.push(line);
    }
  }

  const oids = Object.keys(orders);
  for (const oid of oids) {
    const order = orders[oid]!;
    debugger;
    if (
      SALES_CHANNEL &&
      order?.channelInformation?.channelDefinition?.channelName !==
        SALES_CHANNEL
    ) {
      delete orders[oid];
    }
  }

  return { orders };
}
