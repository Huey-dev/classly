'use client';

import { useState, useRef } from 'react';
import MuxUploader, { MuxUploaderDrop, MuxUploaderFileSelect } from '@mux/mux-uploader-react';
import { useRouter } from 'next/navigation';
import { saveVideoToLibrary } from '../../../lib/actions';

// Unique ID for the hidden MuxUploader component
const UPLOADER_ID = 'custom-mux-uploader';

export default function UploadClient() {
  // State for user input metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Upload/Processing State
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [titleWarning, setTitleWarning] = useState(false);

  const router = useRouter();

  // --- Mux API Interaction ---
  const getUploadUrl = async () => {
    if (!title.trim()) {
      setError('Please add a video title before uploading');
      setTitleWarning(true);
      throw new Error('Title required');
    }

    try {
      setError(null);
      setTitleWarning(false);
      setIsUploading(true);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get upload URL');
      }

      const { uploadUrl, uploadId } = await response.json();
      setUploadId(uploadId);
      return uploadUrl;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create upload';
      setError(message);
      setIsUploading(false);
      throw err;
    }
  };

  const handleSuccess = () => {
    console.log('✅ Upload complete!');
    setIsUploading(false);
    setUploadComplete(true);
    setUploadProgress(100);
  };

  const handleError = (error: any) => {
    console.error('❌ Upload error:', error);
    setError('Upload failed. Please try again.');
    setIsUploading(false);
    setUploadComplete(false);
  };

  // 1. PROGRESS BAR LOGIC - Verified correct
  const handleProgress = (event: any) => {
    const progress = event.detail?.progress || 0;
    // Math.round() ensures we get whole numbers (0, 1, 2, ..., 100)
    setUploadProgress(Math.round(progress)); 
  };

  // --- Database Save (Server Action Call) ---
  const handlePublish = async () => {
    if (!uploadId || !title || isSaving) {
      if (!title) setError('A video title is required before publishing.');
      if (!uploadId) setError('The video file has not been uploaded yet.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveVideoToLibrary({
        title,
        description,
        muxUploadId: uploadId,
      });

      if (result.success) {
        // Assuming video watch page is '/watch/[id]' or homepage is '/'
        // Redirecting to homepage for now based on your code:
        router.push('/');
      } else {
        throw new Error('Server action failed to return success.');
      }
    } catch (e) {
      console.error('Failed to save metadata:', e);
      setError('Failed to save video metadata. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Clear title warning when user starts typing
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    if (titleWarning && e.target.value.trim()) {
      setTitleWarning(false);
      setError(null);
    }
  };

  // --- Render Function ---
  const isFormDisabled = isUploading || isSaving;
  const canPublish = uploadComplete && title && !isSaving;
  const isUploadDisabled = isFormDisabled || !title.trim();

  return (
    // Max width set higher for desktop/tablet, centered
    <div className="min-h-screen bg-gray-50 md:bg-white"> 
      {/* Ensure the container width is reasonable on all screens */}
      <div className="w-full max-w-4xl mx-auto min-h-screen bg-white flex flex-col shadow-xl md:shadow-none"> 
        
        {/* Header - Sticky */}
        <div className="flex sticky top-0 z-50 bg-white justify-between items-center px-4 py-3 border-b border-gray-200">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Go Back"
          >
            <IconArrowLeft />
          </button>

          <span className="font-semibold text-base text-gray-900">
            Upload Video
          </span>

          <button
            onClick={handlePublish}
            disabled={!canPublish}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${
              canPublish
                ? 'text-white bg-blue-600 hover:bg-blue-700' // Changed to blue button for prominence
                : 'text-gray-300 bg-gray-100 cursor-not-allowed' // Dimmed background when disabled
            }`}
          >
            {isSaving ? 'Publishing...' : 'Publish'}
          </button>
        </div>

        {/* Main Form Content */}
        {/* Added padding adjustments for mobile/tablet/desktop */}
        <div className="flex-1 px-4 sm:px-6 py-6 space-y-8 overflow-y-auto"> 
          
          {/* Hidden MuxUploader - Core logic handler */}
          <MuxUploader
            id={UPLOADER_ID}
            endpoint={getUploadUrl}
            onUploadStart={() => setIsUploading(true)}
            onSuccess={handleSuccess}
            onError={handleError}
            onProgress={handleProgress}
            style={{ display: 'none' }} 
          />
          
          {/* Success Banner (Simplified) */}
          {canPublish && !isSaving && (
            <div className="bg-green-100 border-l-4 border-green-500 rounded p-4">
              <p className="font-semibold text-green-800">✅ Video Uploaded. Ready to Publish!</p>
            </div>
          )}

          {/* Error Display (Simplified) */}
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 rounded p-4">
              <p className="font-semibold text-red-800">⚠️ Error: {error}</p>
            </div>
          )}

          {/* Video Metadata Section (Title, Description, etc.) */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-900 border-b pb-3">Video Details</h3>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm text-gray-700 font-medium flex items-center gap-1">
                Video Title
                <span className="text-red-500">*</span>
              </label>
              <input
                value={title}
                onChange={handleTitleChange}
                placeholder="Enter the title of your video"
                className={`w-full px-4 py-2 text-base border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  titleWarning
                    ? 'border-red-400 focus:ring-red-500 bg-red-50'
                    : title
                    ? 'border-green-400 focus:ring-green-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                disabled={isFormDisabled}
              />
              {titleWarning && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <span>⚠️</span> Title is required before uploading
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm text-gray-700 font-medium">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a detailed description for your video"
                className="w-full min-h-[120px] px-4 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                disabled={isFormDisabled}
              />
            </div>
          </div>
          
          {/* Video Upload Section */}
          <div className="space-y-4 py-2 border-t pt-8">
            <h3 className="text-xl font-bold text-gray-900">
              Video File
            </h3>

            {/* Uploading Progress */}
            {isUploading && !uploadComplete && (
              <div className="p-5 bg-blue-50 rounded-lg border-2 border-blue-400 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0 animate-bounce">
                      <IconUpload className="text-blue-600 w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900">
                        Uploading file...
                      </p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        Please wait.
                      </p>
                    </div>
                  </div>
                  <span className="text-3xl font-extrabold text-blue-600 tabular-nums w-16 text-right">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload Complete */}
            {uploadComplete && (
              <div className="p-5 bg-green-50 rounded-lg border-2 border-green-500">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <IconCheckCircle className="text-green-600 w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-green-900">
                        Upload Complete!
                      </p>
                      <p className="text-xs text-green-700 mt-0.5">
                        Your video is processing and ready to publish.
                      </p>
                    </div>
                  </div>
                  <IconCheckCircle className="text-green-600" size={28} />
                </div>
              </div>
            )}

            {/* Upload Area - When not uploading or complete */}
            {!isUploading && !uploadComplete && (
              <MuxUploaderDrop
                mux-uploader={UPLOADER_ID}
                overlay-text="Drop your video here to upload"
                className={`relative border-2 border-dashed rounded-xl p-10 transition-all duration-200 ${
                  isUploadDisabled
                    ? 'opacity-50 cursor-not-allowed border-gray-300 bg-gray-50'
                    : 'border-blue-400 bg-blue-50 hover:border-blue-500 hover:bg-blue-100'
                }`}
              >
                {/* Custom Heading Slot */}
                <div slot="heading" className="flex flex-col items-center justify-center gap-4">
                  
                  {/* Upload Icon */}
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-blue-200">
                    <IconUploadLarge className="w-8 h-8 text-blue-600" />
                  </div>

                  {/* Text Content */}
                  <div className="text-center space-y-1">
                    <p className="text-base font-semibold text-gray-900">
                      Drag and drop your video file here
                    </p>
                    <p className="text-sm text-gray-600">
                      (MP4, MOV, WebM)
                    </p>
                  </div>
                </div>

                {/* Custom Separator Slot - Using a visible line */}
                <div slot="separator" className="my-4 flex items-center">
                    <span className="flex-grow border-t border-gray-300"></span>
                    <span className="flex-shrink mx-4 text-gray-400 text-xs font-medium">OR</span>
                    <span className="flex-grow border-t border-gray-300"></span>
                </div>

                {/* Custom File Select Button (Default Slot) */}
                <MuxUploaderFileSelect
                  mux-uploader={UPLOADER_ID}
                >
                  <button
                    type="button"
                    className={`mt-2 px-6 py-2.5 rounded-lg text-base font-semibold transition-all flex items-center justify-center mx-auto gap-2 shadow-md ${
                      isUploadDisabled
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <IconUploadSmall className="w-5 h-5" />
                    Select Video File
                  </button>
                </MuxUploaderFileSelect>
              </MuxUploaderDrop>
            )}

            {/* Saving State */}
            {isSaving && (
              <div className="p-5 bg-purple-50 rounded-lg border-2 border-purple-400">
                <div className="flex items-center gap-3">
                  <div className="animate-spin w-6 h-6 flex items-center justify-center">
                    <IconSpinner className="text-purple-600 w-full h-full" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-purple-900">
                      Publishing Your Video...
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      Please wait while we finalize and save your content.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Icon Components (Included for completeness)
const IconArrowLeft = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" ><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
);

const IconUpload = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
);

const IconUploadLarge = ({ className }: { className?: string }) => (
  <svg className={className} width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
);

const IconUploadSmall = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
);

const IconCheckCircle = ({ className, size = 20, }: { className?: string; size?: number; }) => (
  <svg className={className} width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" ><circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" /></svg>
);

const IconSpinner = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);