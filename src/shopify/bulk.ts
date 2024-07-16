import { randomUUID } from "node:crypto";
import { graphql } from "./graphql";
import { SHOPIFY, verbose } from "../vars";

type BulkQueryResponse = {
  bulkOperationRunQuery: {
    bulkOperation: {
      id: string;
      status: string;
      url: string;
    } | null;
    userErrors?: {
      field: string[];
      message: string;
    }[];
  };
};
type BulkMutationResponse = {
  bulkOperationRunMutation: {
    bulkOperation: {
      id: string;
      url: string;
      status: string;
    };
    userErrors: unknown[];
  };
};

type BulkOperationStatus<T> = {
  currentBulkOperation: {
    id: string;
    status: "CREATED" | "RUNNING" | "COMPLETED";
    url: string | null;
    errorCode: null | unknown;
    createdAt: string;
    completedAt: string | null;
    objectCount: string;
    fileSize: string | null;
    partialDataUrl: string | null;
  } | null;
  data?: T[];
};

type StagedUploadCreateResult = {
  stagedUploadsCreate: {
    userErrors: unknown[];
    stagedTargets: {
      url: string;
      resourceUrl: string | null;
      parameters: {
        name: string;
        value: string;
      }[];
    }[];
  };
};

export async function bulkQuery({ query }: { query: string }) {
  const res = await graphql<BulkQueryResponse>({
    store: SHOPIFY.storeName,
    adminAccessToken: SHOPIFY.adminToken,
    query: /* GraphQL */ `
      mutation {
        bulkOperationRunQuery(
          query: """${query}"""
        ) {
          bulkOperation { id status }
          userErrors { field message }
        }
      }
    `,
  });

  if ((res.bulkOperationRunQuery.userErrors?.length ?? 0) > 0) {
    throw new Error(JSON.stringify(res, null, 2));
  }

  return res;
}

export async function bulkMutationStart({
  mutation,
  uploadPath,
}: {
  mutation: string;
  uploadPath: string;
}) {
  const res = await graphql<BulkMutationResponse>({
    store: SHOPIFY.storeName,
    adminAccessToken: SHOPIFY.adminToken,
    query: /* GraphQL */ `
      mutation {
        bulkOperationRunMutation(
          mutation: "${mutation}"
          stagedUploadPath: "${uploadPath}"
        ) {
          bulkOperation { id url status }
          userErrors { field message }
        }
      }
    `,
  });
  if ((res.bulkOperationRunMutation.userErrors?.length ?? 0) > 0)
    throw new Error(JSON.stringify(res, null, 2));
  return res.bulkOperationRunMutation.bulkOperation;
}

export async function checkCurrentBulkOperation<T>({
  mutation = false,
}: {
  mutation?: boolean;
}) {
  const res = await graphql<BulkOperationStatus<T>>({
    store: SHOPIFY.storeName,
    adminAccessToken: SHOPIFY.adminToken,
    query: /* GraphQL */ `
      query ($type: BulkOperationType!) {
        currentBulkOperation(type: $type) {
          id
          status
          errorCode
          createdAt
          completedAt
          objectCount
          fileSize
          url
          partialDataUrl
        }
      }
    `,
    variables: {
      type: mutation ? "MUTATION" : "QUERY",
    },
  });
  return res;
}

export async function pollForBulkResult<T>({
  intervalSeconds = 1,
  mutation,
}: {
  intervalSeconds?: number;
  mutation?: boolean;
}) {
  let lastStatus = "";
  let running = true;
  while (true) {
    const bulkStatus = await checkCurrentBulkOperation<T>({ mutation });
    if (verbose) {
      console.log("bulkStatus", bulkStatus);
    }
    const op = bulkStatus.currentBulkOperation;
    if (op === null) return [] as T[];
    const status = op.status ?? "";
    // status update
    running = ["CREATED", "RUNNING"].includes(status);
    if (status !== lastStatus) lastStatus = status;
    // wait if still running
    if (running) {
      await new Promise((r) => setTimeout(r, intervalSeconds * 1000));
      continue;
    }
    // throw if error
    else if (op.errorCode !== null) {
      throw new Error(JSON.stringify(bulkStatus, null, 2));
    }
    // return empty if no url
    if (op.url === null) return [] as T[];
    // fetch result
    const res = await fetch(op.url);
    // results separated in lines
    const data = (await res.text())
      .trim()
      .split("\n")
      .map((c) => JSON.parse(c) as T);
    return data as T[];
  }
}

export async function createBulkImport({
  mutation,
  text,
}: {
  mutation: string;
  text: string;
}) {
  const res = await graphql<StagedUploadCreateResult>({
    store: SHOPIFY.storeName,
    adminAccessToken: SHOPIFY.adminToken,
    query: /* GraphQL */ `
      mutation ($filename: String!) {
        stagedUploadsCreate(
          input: {
            resource: BULK_MUTATION_VARIABLES
            filename: $filename
            mimeType: "text/jsonl"
            httpMethod: POST
          }
        ) {
          userErrors {
            field
            message
          }
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
        }
      }
    `,
    variables: { filename: randomUUID() },
  });
  const data = res.stagedUploadsCreate.stagedTargets[0];

  const form = new FormData();
  for (const param of data.parameters) {
    form.append(param.name, param.value);
  }
  form.append("file", new Blob([text], { type: "text/jsonl" }));
  const uploadResult = await fetch(data.url, { method: "POST", body: form });

  if (!uploadResult.ok)
    throw new Error("Import from file failed" + uploadResult.statusText);

  const mutRes = await bulkMutationStart({
    mutation: mutation,
    uploadPath: data.parameters.find((p) => p.name === "key")!.value,
  });

  return mutRes;
}
