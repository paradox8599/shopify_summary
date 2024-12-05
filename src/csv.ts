export function toCSV({
  keys,
  values,
}: {
  keys: string[];
  values: { [key: string]: any }[];
}) {
  const csv = [keys.join(",")];
  for (const value of values) {
    const row = [];
    for (const key of keys) {
      let val = value[key];
      switch (typeof val) {
        case "string":
          val = val.replace(/"/g, '""');
          val = `"${val}"`;
          break;
        case "number":
          if (!Number.isInteger(val)) {
            val = Number.parseFloat(val.toFixed(2));
          }
      }
      row.push(val);
    }
    csv.push(row.join(","));
  }
  return csv.join("\n");
}
