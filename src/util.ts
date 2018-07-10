import { createHash } from "crypto";

export function createId(url: string) {
  const md5 = createHash("md5");
  md5.update(url);
  return `_${md5.digest("hex")}`;
}
