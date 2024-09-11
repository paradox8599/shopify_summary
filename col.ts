import { toCSV } from "./src/csv";
import { pollForBulkResult } from "./src/shopify/bulk";
import { bulkQueryCollectionsProducts } from "./src/shopify/collections";
import { COUNTRY_CODE } from "./src/vars";
import fs from "fs";
import _ from "lodash";

async function main() {
  const cached = false;
  const allCollections = cached
    ? ((await pollForBulkResult<unknown>({})) as Awaited<
      ReturnType<typeof bulkQueryCollectionsProducts>
    >)
    : await bulkQueryCollectionsProducts();
  const collections = allCollections.filter((c) =>
    c.title.startsWith("In Stock -"),
  );
  const products = collections
    .flatMap((c) => c.products)
    .filter((p) => p.status === "ACTIVE");
  const variants = products.flatMap((p) => p.variants);

  const uniqVariants = _.uniqBy(variants, (v) => v.id);

  const out = uniqVariants.map((v) => ({
    title: `${v.product?.title} - ${v.title}`,
    vid: v.id,
    pid: v.raw.__parentId,
    collection: v.product?.collection?.title,
    g_id: `shopify_${COUNTRY_CODE}_${v.raw.__parentId.split("/").pop()}_${v.id.split("/").pop()}`,
  }));

  const csv = toCSV({
    keys: ["g_id", "collection", "title", "vid", "pid"],
    values: out,
  });
  fs.writeFileSync("col.csv", csv);
}
main();
