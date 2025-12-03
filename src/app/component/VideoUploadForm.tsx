'use client';

import React, { useState, useCallback } from 'react';
// IMPORTANT: Ensure this path is correct for your Server Action
import { saveVideoToLibrary } from '../../../lib/actions'; 

// Define the component props
interface VideoUploadFormProps {
  // Function to call after a successful upload (e.g., to close a modal or refresh a list)
  onUploadSuccess: () => void; 
}

// Define the state for the upload process
type UploadStatus = 'idle' | 'getting-url' | 'uploading' | 'saving-metadata' | 'success' | 'error';

const VideoUploadForm: React.FC<VideoUploadFormProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setFile(selectedFile);
      setError(null);
    } else {
      setFile(null);
      setError('Please select a valid video file.');
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file || !title) {
      setError('Please select a video file and provide a title.');
      return;
    }

    try {
      // --- STEP 1: Get Mux Direct Upload URL from API Route ---
      setStatus('getting-url');
      const apiResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileType: file.type }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Failed to get Mux upload URL.');
      }

      const { uploadUrl, uploadId } = await apiResponse.json();

      // --- STEP 2: Upload Video File Directly to Mux ---
      // This is the crucial direct upload to the pre-signed Mux URL
      setStatus('uploading');
      
      // Use XMLHttpRequest for better progress tracking than fetch
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);

      // Set up progress listener
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
        }
      };

      // Set up completion listener
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            // Mux returns non-2xx status on failure
            reject(new Error(`Upload failed with status ${xhr.status}.`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload.'));
        xhr.send(file);
      });

      await uploadPromise;
      setProgress(100);

      // --- STEP 3: Call Server Action to Save Metadata ---
      // This is the final step that links the Mux asset to your Prisma database
      setStatus('saving-metadata');
      
      const result = await saveVideoToLibrary({
        title,
        description,
        muxUploadId: uploadId, // Pass the Mux ID to the Server Action
      });

      // The Server Action should return an object with a 'success' property
      if (result.success) {
        setStatus('success');
        onUploadSuccess();
      } else {
        // This should ideally be caught by the Server Action's error handling, but is a safeguard
        throw new Error('Failed to save video metadata to database.');
      }

    } catch (err) {
      console.error('Video upload process failed:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during upload.');
      setStatus('error');
    }
  }, [file, title, description, onUploadSuccess]);

  const statusMessages: Record<UploadStatus, string> = {
    'idle': 'Ready to upload.',
    'getting-url': 'Requesting secure upload link...',
    'uploading': `Uploading video... ${progress}%`,
    'saving-metadata': 'Upload complete. Saving video details to database...',
    'success': 'Video successfully uploaded and saved!',
    'error': 'Upload failed.',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 border rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold">Upload New Video</h2>
      
      {/* File Input */}
      <div>
        <label htmlFor="video-file" className="block text-sm font-medium text-gray-700">Video File</label>
        <input
          id="video-file"
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          disabled={status !== 'idle' && status !== 'error'}
        />
      </div>

      {/* Title Input */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          placeholder="e.g., Introduction to Next.js 15"
          required
          disabled={status !== 'idle' && status !== 'error'}
        />
      </div>

      {/* Description Input */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          disabled={status !== 'idle' && status !== 'error'}
        />
      </div>

      {/* Status and Error Display */}
      <div className="text-sm">
        <p className={`font-semibold ${status === 'error' ? 'text-red-600' : status === 'success' ? 'text-green-600' : 'text-blue-600'}`}>
          Status: {statusMessages[status]}
        </p>
        {error && <p className="text-red-600 mt-1">Error: {error}</p>}
      </div>

      {/* Progress Bar */}
      {(status === 'uploading' || status === 'saving-metadata') && (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        disabled={!file || !title || status === 'uploading' || status === 'getting-url' || status === 'saving-metadata' || status === 'success'}
      >
        {status === 'uploading' ? 'Uploading...' : status === 'saving-metadata' ? 'Finalizing...' : 'Start Upload'}
      </button>
    </form>
  );
};

export default VideoUploadForm;
