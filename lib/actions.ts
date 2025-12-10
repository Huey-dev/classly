"use server";

import { prisma } from "./prisma";
import { getUserFromRequest } from "./auth/getUserFromRequest";
import Mux from "@mux/mux-node";
import { revalidatePath } from "next/cache"; 
const mux = new Mux();

interface SaveDraftParams {
  title: string;
  description: string;
  muxUploadId: string;
  courseId?: string;
  partNumber?: number;
  sectionTitle?: string;
  durationSeconds?: number;
  fileSizeBytes?: number;
  fileFormat?: string;
}

/**
 * Saves a video as a "Draft" to the user's library.
 * Independent of any classroom.
 */
export async function saveVideoToLibrary(params: SaveDraftParams) {
  const user = await getUserFromRequest();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const {
    title,
    description,
    muxUploadId,
    courseId,
    partNumber,
    sectionTitle,
    durationSeconds,
    fileSizeBytes,
    fileFormat,
  } = params;

  try {
    // 1. Verify the upload exists in Mux
    const upload = await mux.video.uploads.retrieve(muxUploadId);

    const passthrough = upload.new_asset_settings?.passthrough;
    const { userId: owner } = JSON.parse(passthrough || "{}");

    if (owner !== user.id) {
      throw new Error("Unauthorized: Upload does not belong to this user.");
    }

    // 2. We do NOT wait for the asset to be fully ready here to avoid timeouts.
    // We store the upload_id and will let a Webhook or the UI polling update the status later.
    // However, if Mux was fast, we might have an asset_id already.

    let muxAssetId = upload.asset_id || null;
    let muxPlaybackId = null;
    let videoUrl = null;

    // If Mux was super fast, try to get the asset details
    if (muxAssetId) {
      try {
        const asset = await mux.video.assets.retrieve(muxAssetId);
        muxPlaybackId = asset.playback_ids?.[0]?.id;
        if (muxPlaybackId) {
          videoUrl = `https://stream.mux.com/${muxPlaybackId}.m3u8`;
        }
      } catch (e) {
        // Ignore asset retrieval error, we will just save the draft
        console.log("Asset not fully ready yet, saving as processing.");
      }
    }

    // 3. Create the Content Record detached from Classroom
    const newVideo = await prisma.content.create({
      data: {
        userId: user.id,
        title,
        description,
        type: "VIDEO",
        status: muxPlaybackId ? "READY" : "PROCESSING", 
        muxUploadId: muxUploadId,
        muxAssetId: muxAssetId,
        muxPlaybackId: muxPlaybackId,
        url: videoUrl,
        classroomId: null,
        courseId: courseId || null,
        partNumber: partNumber ?? null,
        accessLevel: sectionTitle?.trim() || null,
      },
    });

    if (courseId) {
      revalidatePath(`/course/${courseId}`);
    }

    // Best-effort seed metadata so durations show immediately
    if (durationSeconds !== undefined || fileSizeBytes !== undefined || fileFormat !== undefined) {
      await prisma.mediaMetadata.upsert({
        where: { contentId: newVideo.id },
        update: {
          duration: durationSeconds ?? undefined,
          size: fileSizeBytes ?? undefined,
          format: fileFormat ?? undefined,
        },
        create: {
          contentId: newVideo.id,
          duration: durationSeconds ?? 0,
          size: fileSizeBytes ?? 0,
          format: fileFormat ?? "unknown",
        },
      });
    }
    revalidatePath("/");                
    revalidatePath("/explore");          
    revalidatePath(`/video/${newVideo.id}`); 
    return { success: true, video: newVideo };
  } catch (error) {
    console.error("Error saving to library:", error);
    throw new Error("Failed to save video to library.");
  }
}
