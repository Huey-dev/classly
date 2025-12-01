import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '../../../../lib/auth/getUserFromRequest';
import Mux from '@mux/mux-node';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getUserFromRequest();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // get origin for CORS from browser request or env
    const incomingOrigin = request.headers.get('origin');
    // fallback env
    const envOrigin = process.env.NEXT_PUBLIC_BASE_URL;
    // final origin
    const origin = incomingOrigin || envOrigin || 'http://localhost:3000';

    console.log('Creating Mux upload for user:', user.id, 'origin:', origin);
    // Create the Mux upload
    const upload = await mux.video.uploads.create({
      cors_origin: origin,
      new_asset_settings: {
        playback_policy: ['public'],
        passthrough: JSON.stringify({ userId: user.id }),
      },
    });

    console.log('Upload created:', upload.id);

    // Return the upload URL to the client
    return NextResponse.json({
      uploadUrl: upload.url,
      uploadId: upload.id,
    });
  } catch (error: any) {
    console.error('Failed to create Mux upload:', error);

    // Handle Mux free plan limit error
    if (error?.error?.messages?.[0]?.includes('Free plan is limited')) {
      return NextResponse.json(
        {
          error:
            'Free plan limit reached. You have 10 videos. Please delete some from your Mux dashboard to upload more.',
        },
        { status: 400 }
      );
    }

    // Network / DNS issues reaching Mux
    if (error?.code === 'EAI_AGAIN' || error?.cause?.code === 'EAI_AGAIN') {
      return NextResponse.json(
        { error: 'Mux API not reachable. Check internet/DNS and MUX_TOKEN_ID/MUX_TOKEN_SECRET.' },
        { status: 503 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: 'Failed to create upload. Please try again.' },
      { status: 500 }
    );
  }
}
