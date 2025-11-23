import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import get from 'lodash.get';

// NOTE: You must install lodash: npm install lodash @types/lodash
import WEBHOOK_TYPES from "../../../../lib/webhooks/mux/types"; 

const webhookSecret = process.env.MUX_WEBHOOK_SECRET;
const mux = new Mux();

// Helper to get the raw request body from a NextRequest
async function getRawBody(req: NextRequest): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of req.body as any) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

// Ensure this handler only accepts POST requests
export async function POST(req: NextRequest) {
    // 1. Get the raw body for signature verification
    const rawBody = await getRawBody(req);
    const rawBodyString = rawBody.toString('utf8');
    
    // 2. Verify Signature
    try {
        if (webhookSecret) {
            // This is crucial: it throws an error if the signature is invalid
            mux.webhooks.verifySignature(
                rawBodyString, 
                req.headers as unknown as Record<string, string>, 
                webhookSecret
            );
        } else {
            // Only for development, should be set in production
            console.log('Skipping webhook signature verification because no secret is configured');
        }
    } catch (e) {
        console.error('Webhook signature verification failed:', e);
        // Respond with 401 if the request is not authenticated
        return new NextResponse("Webhook signature verification failed.", { status: 401 });
    }

    // 3. Parse Body and Get Handler
    const jsonBody = JSON.parse(rawBodyString);
    const { data, type } = jsonBody;
    
    // Mux events are like 'video.asset.ready'. We use lodash.get to map this
    // to our handler structure (e.g., WEBHOOK_TYPES['video.asset']['ready'])
    const WEBHOOK_TYPE_HANDLER = get(WEBHOOK_TYPES, type); 

    if (WEBHOOK_TYPE_HANDLER) {
        try {
            // Retrieve the passthrough data (user ID)
            const passthrough = data.passthrough || data.new_asset_settings?.passthrough;
            const metadata = JSON.parse(passthrough);

            await WEBHOOK_TYPE_HANDLER({ data, metadata });
            
            // 4. Success: Respond 200 (Mux requires 200 to consider the webhook handled)
            return new NextResponse(null, { status: 200 });

        } catch (err) {
            if (err instanceof Error) {
                console.error(`Webhook Execution Error for type ${type}: ${err.message}`);
                // Return 400/500 to tell Mux to retry the webhook
                return new NextResponse(`Webhook Execution Error: ${err.message}`, { status: 500 });
            }
            console.error('Unknown Webhook Request error', err);
            return new NextResponse("Unknown Webhook Error", { status: 500 });
        }
    } else {
        // Ignore unhandled event types (e.g., video.asset.deleted)
        console.log(`Ignoring unhandled webhook type: ${type}`);
        return new NextResponse(null, { status: 200 });
    }
}