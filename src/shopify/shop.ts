import { SHOPIFY } from "../vars";
import { graphql } from "./graphql";

type Shop = {
  shop: {
    countriesInShippingZones: { countryCodes: string[] };
  };
};

export async function getCountryCodes() {
  const res = await graphql<Shop>({
    store: SHOPIFY.storeName,
    adminAccessToken: SHOPIFY.adminToken,
    query: /* GraphQL */ `
      query {
        shop {
          countriesInShippingZones {
            countryCodes
          }
        }
      }
    `,
  });
  return res.shop.countriesInShippingZones.countryCodes;
}
