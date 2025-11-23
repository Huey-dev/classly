import { prisma } from "../../../../../lib/prisma"; 

type Props = {
  data: { [key: string]: any };
  metadata: { userId: string };
};

// Mux sends 'video.asset.created' when processing begins
const handler = async ({ data, metadata }: Props) => {
  const { upload_id, id: mux_asset_id, status } = data; // 'id' is the Asset ID

  // Update the Content record created during the initial POST /api/upload
  await prisma.content.updateMany({
    where: {
      muxUploadId: upload_id,
      // Ensure we only update records not yet marked as READY
      status: { not: 'READY' } 
    },
    data: {
      muxAssetId: mux_asset_id,
      status: 'PROCESSING', // Ensure status is set to PROCESSING
    },
  });
};

export default handler;