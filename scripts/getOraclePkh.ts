import { getAddressDetails } from "@lucid-evolution/lucid";
import * as dotenv from "dotenv";

/**
 * Quick helper to derive a payment key hash (PKH) for the oracle.
 * Usage:
 *   npx tsx scripts/getOraclePkh.ts addr_test1...
 *   # or set ORACLE_ADDRESS in .env and just run the script
 */
dotenv.config();

function main() {
  const address = process.argv[2] || process.env.ORACLE_ADDRESS;
  if (!address) {
    throw new Error("Provide an oracle address as argv[2] or set ORACLE_ADDRESS in .env");
  }

  const pkh = getAddressDetails(address).paymentCredential?.hash;
  if (!pkh) {
    throw new Error("Could not derive payment credential hash from the provided address");
  }

  console.log("Oracle address:", address);
  console.log("Oracle PKH:    ", pkh);
  console.log("Set this as NEXT_PUBLIC_ORACLE_PKH for the app.");
}

main();