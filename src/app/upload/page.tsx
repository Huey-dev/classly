export const dynamic = "force-dynamic";

import { getUserFromRequest } from '../../../lib/auth/getUserFromRequest';
import { redirect } from 'next/navigation';
import UploadClient from './UploadClient'

export default async function UploadPage() {
  // Protect the route
  const user = await getUserFromRequest();
  if (!user) {
    redirect('/signin');
  }

  // Just render the client component - it will fetch the upload URL when needed
  return (
    <UploadClient />
  );
}
