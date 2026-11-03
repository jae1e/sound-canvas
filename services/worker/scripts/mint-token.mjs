// Usage: TOKEN_SIGNING_SECRET=... node scripts/mint-token.mjs [installId]
// Prints a bearer token `<installId>.<hmac>` to paste into the app config (dev) or issue per install.
import { createHmac, randomBytes } from "node:crypto";

const secret = process.env.TOKEN_SIGNING_SECRET;
if (!secret) {
  console.error("Set TOKEN_SIGNING_SECRET");
  process.exit(1);
}
const id = process.argv[2] ?? randomBytes(12).toString("hex");
console.log(`${id}.${createHmac("sha256", secret).update(id).digest("hex")}`);
