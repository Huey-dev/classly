'use client';

import { useState } from 'react';
import MuxUploader from '@mux/mux-uploader-react';
import { useRouter } from 'next/navigation';

export default function UploadClient() {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  // This function is called when user selects a file
  const getUploadUrl = async () => {
    try {
      setError(null);
      
      // Fetch upload URL from your API
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get upload URL');
      }

      const { uploadUrl } = await response.json();
      return uploadUrl; // Return the URL string
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create upload';
      setError(message);
      throw err; // Re-throw so MuxUploader knows it failed
    }
  };

  const handleSuccess = () => {
    console.log('✅ Upload complete! Processing...');
    setIsProcessing(true);
    
    // Redirect after a moment
    setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
  };

  const handleError = (error: any) => {
    console.error('❌ Upload error:', error);
    setError('Upload failed. Please try again.');
    setIsProcessing(false);
  };

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Upload Error</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
          
          {error.includes('Free plan is limited') && (
            <div className="mt-3 text-sm text-red-700">
              <p><strong>To fix this:</strong></p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Go to <a href="https://dashboard.mux.com" target="_blank" rel="noopener noreferrer" className="underline">Mux Dashboard</a></li>
                <li>Delete some test videos (Video → Assets)</li>
                <li>Try uploading again</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {isProcessing && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-semibold">✅ Upload Complete!</p>
          <p className="text-green-700 text-sm mt-1">
            Your video is being processed. Redirecting to dashboard...
          </p>
        </div>
      )}

      {/* Mux Uploader - endpoint is a function that returns a promise */}
      <MuxUploader
        endpoint={getUploadUrl}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}