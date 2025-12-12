export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * Server escrow creation is handled client-side for demo; this stub avoids bundling WASM deps.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: "Escrow creation is handled client-side in the demo flow." },
    { status: 501 }
  );
}
