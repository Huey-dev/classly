'use client';

import VideoUploadForm from '../component/VideoUploadForm';

export default function UploadPage() {
  const handleSuccess = () => {
    alert('Video upload complete!');
    // Optionally refresh the page or update a user video list
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Upload Your Video</h1>
      <VideoUploadForm onUploadSuccess={handleSuccess} />
    </div>
  );
}
