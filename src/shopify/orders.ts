import { bulkQuery, pollForBulkResult } from "./bulk";

type Order = { id: string };

type Price = { amount: string; currencyCode: string };

type OrderProduct = {
  id: string;
  title: string;
  productType: string;
  compareAtPriceRange: {
    maxVariantCompareAtPrice: Price;
    minVariantCompareAtPrice: Price;
  };
};

type OrderLineItem = {
  id: string;
  unfulfilledOriginalTotalSet: { presentmentMoney: Price; shopMoney: Price };
  product: OrderProduct | null;
  __parentId: string;
};

type OrderBulkResult = Order | OrderLineItem;

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

  let orders_bulk_data = await pollForBulkResult<OrderBulkResult>({});
  // orders_bulk_data = orders_bulk_data.splice(0, 20);
  // for (const line of orders_bulk_data) {
  //   console.log(line);
  // }
  return orders_bulk_data;
}
