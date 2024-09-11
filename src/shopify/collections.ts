import { Emoji } from "../vars";
import { bulkQuery, pollForBulkResult } from "./bulk";

/**
 * Product
 */

type RawShopifyProduct = {
  id: string;
  title: string;
  status: "ACTIVE" | "DRAFT";
  __parentId: string;
};

class ShopifyProduct {
  raw: RawShopifyProduct;
  variants: ShopifyVariant[] = [];
  collection?: ShopifyCollection;

  constructor(raw: RawShopifyProduct) {
    this.raw = raw;
  }

  public get id(): RawShopifyProduct["id"] {
    return this.raw.id;
  }

  public get title(): RawShopifyProduct["title"] {
    return this.raw.title;
  }
  public get status(): RawShopifyProduct["status"] {
    return this.raw.status;
  }
}

/**
 * Variant
 */

type RawShopifyVariant = {
  id: string;
  title: string;
  __parentId: string;
};

class ShopifyVariant {
  raw: RawShopifyVariant;
  product?: ShopifyProduct;

  constructor(raw: RawShopifyVariant) {
    this.raw = raw;
  }

  public get id(): RawShopifyVariant["id"] {
    return this.raw.id;
  }

  public get title(): RawShopifyVariant["title"] {
    return this.raw.title;
  }
}

/**
 * Collection
 */

type RawShopifyCollection = {
  id: string;
  title: string;
};

class ShopifyCollection {
  raw: RawShopifyCollection;
  products: ShopifyProduct[] = [];

  constructor(raw: RawShopifyCollection) {
    this.raw = raw;
  }

  public get id(): RawShopifyCollection["id"] {
    return this.raw.id;
  }

  public get title(): RawShopifyCollection["title"] {
    return this.raw.title;
  }
}

type RawCollectionData =
  | RawShopifyCollection
  | RawShopifyProduct
  | RawShopifyVariant;

function isProduct(raw: RawCollectionData): raw is RawShopifyProduct {
  return raw.id.startsWith("gid://shopify/Product");
}

function isCollection(raw: RawCollectionData): raw is RawShopifyCollection {
  return raw.id.startsWith("gid://shopify/Collection");
}

function isVariant(raw: RawCollectionData): raw is RawShopifyVariant {
  return raw.id.startsWith("gid://shopify/ProductVariant");
}

export async function bulkQueryCollectionsProducts() {
  console.log(Emoji.fetch, "Fetching shopify collections...");
  await bulkQuery({
    query: /* GraphQL */ `
      query CollectionProductVariants {
        collections(query: "title:In Stock") {
          edges {
            node {
              id
              title
              products {
                edges {
                  node {
                    id
                    title
                    status
                    variants {
                      edges {
                        node {
                          id
                          title
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

  const items = await pollForBulkResult<RawCollectionData>({});

  const collections = items
    .filter((i) => isCollection(i))
    .map((c) => new ShopifyCollection(c));
  const colObj = collections.reduce(
    (acc, c) => {
      acc[c.id] = c;
      return acc;
    },
    {} as Record<string, ShopifyCollection>,
  );

  const products = items
    .filter((i) => isProduct(i))
    .map((p) => new ShopifyProduct(p));
  const prodObj = products.reduce(
    (acc, p) => {
      acc[p.id] = p;
      return acc;
    },
    {} as Record<string, ShopifyProduct>,
  );

  const variants = items
    .filter((i) => isVariant(i))
    .map((i) => new ShopifyVariant(i));

  for (const variant of variants) {
    const product: ShopifyProduct | undefined = prodObj[variant.raw.__parentId];
    variant.product = product;
    product?.variants.push(variant);
  }

  for (const product of products) {
    const collection: ShopifyCollection | undefined =
      colObj[product.raw.__parentId];
    product.collection = collection;
    collection?.products.push(product);
  }

  console.log(Emoji.done, `${collections.length} shopify collections fetched`);
  return collections; //.map((c) => new ShopifyCollection(c));
}
