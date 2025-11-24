import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import get from 'lodash.get';
import WEBHOOK_TYPES from '../../../../lib/webhooks/mux/types';

const webhookSecret = process.env.MUX_WEBHOOK_SECRET;
const mux = new Mux();

// Helper to get the raw request body for signature verification
async function getRawBody(req: NextRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req.body as any) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  // 1. Get raw body for signature verification
  const rawBody = await getRawBody(req);
  const rawBodyString = rawBody.toString('utf8');

  // 2. Verify webhook signature (CRITICAL for security)
  try {
    if (webhookSecret) {
      mux.webhooks.verifySignature(
        rawBodyString,
        req.headers as unknown as Record<string, string>,
        webhookSecret
      );
    } else {
      console.warn('⚠️ Webhook signature verification skipped - no secret configured');
    }
  } catch (e) {
    console.error('❌ Webhook signature verification failed:', e);
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 3. Parse webhook body
  const jsonBody = JSON.parse(rawBodyString);
  const { data, type } = jsonBody;

  console.log(`📥 Received Mux webhook: ${type}`);

  // 4. Get the appropriate handler for this event type
  const WEBHOOK_TYPE_HANDLER = get(WEBHOOK_TYPES, type);

  if (WEBHOOK_TYPE_HANDLER) {
    try {
      // Extract user ID from passthrough data
      const passthrough = data.passthrough || data.new_asset_settings?.passthrough;
      
      let metadata;
      if (passthrough) {
        try {
          // Try to parse as JSON first (if you're passing JSON)
          metadata = JSON.parse(passthrough);
        } catch {
          // If it's just a string (userId), wrap it in an object
          metadata = { userId: passthrough };
        }
      } else {
        console.error('❌ No passthrough data found in webhook');
        return new NextResponse('Missing passthrough data', { status: 400 });
      }

      // Execute the handler
      await WEBHOOK_TYPE_HANDLER({ data, metadata });

      console.log(`✅ Successfully processed ${type} webhook`);
      return new NextResponse(null, { status: 200 });

    } catch (err) {
      if (err instanceof Error) {
        console.error(`❌ Webhook handler error for ${type}:`, err.message);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 500 });
      }
      console.error('❌ Unknown webhook error:', err);
      return new NextResponse('Unknown Error', { status: 500 });
    }
  } else {
    // Not an error - just an event type we don't handle
    console.log(`ℹ️ Ignoring unhandled webhook type: ${type}`);
    return new NextResponse(null, { status: 200 });
  }
}