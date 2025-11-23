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
  const { upload_id, playback_ids, duration, status, aspect_ratio } = data;

  // Find the public playback ID (the one you'll use for the MuxPlayer)
  const publicPlaybackId = playback_ids.find((row: PlaybackId) => row.policy === 'public')?.id;

  if (!publicPlaybackId) {
    console.error(`Asset ${data.id} is ready but no public playback ID found.`);
    return;
  }

  // update the Content record with the final playback information
  await prisma.content.updateMany({
    where: {
      muxUploadId: upload_id,
    },
    data: {
      muxPlaybackId: publicPlaybackId, // Use the public ID for playback
      status: 'READY',                 // Set the final status
      // You can also save duration and aspect_ratio to a MediaMetadata table if you prefer
    },
  });
}

export default handler;