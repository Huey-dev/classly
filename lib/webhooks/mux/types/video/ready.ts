import { prisma } from "../../../../../lib/prisma"; // Adjust path to your prisma client

type PlaybackId = {
  id: string;
  policy: 'signed' | 'public'
}

type Props = {
  data: { [key: string]: any }
  metadata: { userId: string }
}

// Mux sends 'video.asset.ready' when processing is complete
const handler = async ({ data, metadata }: Props) => {
  const { upload_id, playback_ids, duration } = data;

  // Find the public playback ID (the one you'll use for the MuxPlayer)
  const publicPlaybackId = playback_ids.find((row: PlaybackId) => row.policy === 'public')?.id;

  if (!publicPlaybackId) {
    console.error(`Asset ${data.id} is ready but no public playback ID found.`);
    return;
  }

  // Grab the content by upload ID so we can upsert metadata (duration)
  const content = await prisma.content.findFirst({
    where: { muxUploadId: upload_id },
    select: { id: true },
  });

  if (!content) {
    console.error(`Content not found for upload_id ${upload_id}`);
    return;
  }

  const durationSeconds =
    typeof duration === 'number' && !Number.isNaN(duration) ? Math.round(duration) : null;

  await prisma.content.update({
    where: { id: content.id },
    data: {
      muxPlaybackId: publicPlaybackId, // Use the public ID for playback
      status: 'READY',                 // Set the final status
      mediaMetadata:
        durationSeconds !== null
          ? {
              upsert: {
                update: { duration: durationSeconds },
                create: { duration: durationSeconds, size: 0, format: 'unknown' },
              },
            }
          : undefined,
    },
  });
}

export default handler;
