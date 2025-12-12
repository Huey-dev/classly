export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * Server add-payment is handled client-side in the demo to avoid bundling Cardano WASM deps.
 * This stub keeps the API route valid while preventing WASM import during build.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: "Escrow add-payment is handled client-side in the demo flow." },
    { status: 501 }
  );
}
