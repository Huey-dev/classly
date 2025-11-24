import { getUserFromRequest } from '../../../lib/auth/getUserFromRequest';
import { redirect } from 'next/navigation';
import UploadClient from './UploadClient'

export default async function UploadPage() {
  // Protect the route
  const user = await getUserFromRequest();
  if (!user) {
    redirect('/login');
  }

  // Just render the client component - it will fetch the upload URL when needed
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Upload Video</h1>
      <UploadClient />
      <p className="mt-4 text-sm text-gray-600">
        After upload completes, your video will be processed. 
        Check your <a href="/dashboard" className="text-blue-600 hover:underline">dashboard</a> to see your videos.
      </p>
    </div>
  );
}