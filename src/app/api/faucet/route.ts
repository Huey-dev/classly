import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "../../../../lib/auth/getUserFromRequest";

export const runtime = "nodejs";

const NETWORK = (process.env.NEXT_PUBLIC_NETWORK || process.env.NEXT_PUBLIC_BLOCKFROST_NETWORK || "preview").toLowerCase();
const IS_MAINNET = NETWORK.includes("mainnet");
const BLOCKFROST_BASE = NETWORK.includes("preprod")
  ? "https://cardano-preprod.blockfrost.io/api/v0"
  : NETWORK.includes("mainnet")
  ? "https://cardano-mainnet.blockfrost.io/api/v0"
  : "https://cardano-preview.blockfrost.io/api/v0";
const LUCID_NETWORK = NETWORK.includes("preprod") ? "Preprod" : NETWORK.includes("mainnet") ? "Mainnet" : "Preview";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function handleFaucetRequest(req: NextRequest, body: any) {
  const user = await getUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (IS_MAINNET) {
    return NextResponse.json({ error: "Faucet is disabled on mainnet." }, { status: 400 });
  }

  const address = typeof body.address === "string" ? body.address.trim() : "";
  const requestedAda = Number(body.ada ?? 0);
  const ada = Number.isFinite(requestedAda) && requestedAda > 0 ? clamp(requestedAda, 2, 20) : 5;

  if (!address) return NextResponse.json({ error: "address is required" }, { status: 400 });
  if (!address.startsWith("addr")) {
    return NextResponse.json({ error: "Invalid Cardano address" }, { status: 400 });
  }

  const seed =
    process.env.TESTNET_FAUCET_SEED_PHRASE ||
    process.env.TESTNET_FAUCET_SEED ||
    process.env.FAUCET_SEED_PHRASE ||
    "";
  if (!seed) {
    return NextResponse.json(
      { error: "Faucet is not configured. Set TESTNET_FAUCET_SEED_PHRASE on the server." },
      { status: 501 }
    );
  }
  const words = seed.trim().split(/\s+/).filter(Boolean);
  if (words.length < 12) {
    return NextResponse.json(
      { error: "TESTNET_FAUCET_SEED_PHRASE looks invalid (expected 12/15/24 words)." },
      { status: 400 }
    );
  }

  const BF_KEY = process.env.BLOCKFROST_API_KEY || process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY;
  if (!BF_KEY) {
    return NextResponse.json(
      { error: "Blockfrost API key missing. Set BLOCKFROST_API_KEY or NEXT_PUBLIC_BLOCKFROST_API_KEY." },
      { status: 500 }
    );
  }

  try {
    const { Lucid, Blockfrost } = await import("@lucid-evolution/lucid");

    const lucid = await Lucid(new Blockfrost(BLOCKFROST_BASE, BF_KEY), LUCID_NETWORK as any);
    lucid.selectWallet.fromSeed(seed);

    const lovelace = BigInt(Math.floor(ada * 1_000_000));
    const tx = await lucid.newTx().pay.ToAddress(address, { lovelace }).complete();
    const signed = await tx.sign.withWallet().complete();
    const txHash = await signed.submit();

    return NextResponse.json({ success: true, txHash, ada });
  } catch (e: any) {
    const msg = String(e?.message || "Faucet failed");
    const lowered = msg.toLowerCase();
    if (lowered.includes("not have enough funds") || lowered.includes("not enough funds")) {
      return NextResponse.json(
        {
          error:
            "Faucet wallet has insufficient test ADA to fund users. Fund the faucet wallet address (the one for TESTNET_FAUCET_SEED_PHRASE) from the official testnet faucet, then retry.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/faucet
 *
 * This is a small "proxy faucet" for development testnets. It sends a small amount
 * of test ADA to the provided address using a platform-managed seed phrase.
 *
 * Required env:
 * - TESTNET_FAUCET_SEED_PHRASE: 24-word mnemonic with test ADA on selected network
 * - NEXT_PUBLIC_BLOCKFROST_API_KEY (or BLOCKFROST_API_KEY): Blockfrost key for the same network
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return handleFaucetRequest(req, body);
}

/**
 * GET /api/faucet (legacy / safety net)
 *
 * Some older clients accidentally call GET. For security, this only allows
 * same-origin browser requests; cross-site GETs are rejected to avoid CSRF
 * draining the faucet wallet.
 */
export async function GET(req: NextRequest) {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const address = url.searchParams.get("address") || url.searchParams.get("addr") || "";
  const ada = url.searchParams.get("ada");

  // Best-effort: if query params missing, attempt to parse JSON body (some libs misuse GET+body).
  let body: any = { address, ada: ada ? Number(ada) : undefined };
  if (!body.address) {
    body = await req.json().catch(() => body);
  }

  return handleFaucetRequest(req, body);
}
