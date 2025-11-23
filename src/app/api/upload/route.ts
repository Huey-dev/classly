import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "../../../../lib/auth/getUserFromRequest";
import Mux from "@mux/mux-node";

// Initialize Mux

const mux = new Mux();

/**
 * Generates a Mux Direct Upload URL.
 * Mux handles the file storage and processing.
 */
async function generateMuxDirectUploadUrl(userId: string) {
  try {
    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        passthrough: userId,
        playback_policy: ["public"],
      },

      cors_origin: process.env.NEXT_PUBLIC_BASE_URL || "*",
    });

    return {
      uploadUrl: upload.url,
      uploadId: upload.id,
    };
  } catch (error) {
    console.error("Mux API Error:", error);
    throw new Error("Failed to create Mux Direct Upload.");
  }
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { fileType } = body;

  if (
    !fileType ||
    typeof fileType !== "string" ||
    !fileType.startsWith("video/")
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid or missing 'fileType' in request body. Must be a video type.",
      },
      { status: 400 }
    );
  }

  try {
    const { uploadUrl, uploadId } = await generateMuxDirectUploadUrl(user.id);

    return NextResponse.json({
      uploadUrl,
      uploadId,
    });
  } catch (error) {
    console.error("Error generating Mux upload URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL." },
      { status: 500 }
    );
  }
}
