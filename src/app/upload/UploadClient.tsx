'use client';

import { useState } from 'react';
import MuxUploader from '@mux/mux-uploader-react';
import { useRouter } from 'next/navigation';
import { saveVideoToLibrary } from '../../../lib/actions';

export default function UploadClient() {
  // State for user input metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Upload/Processing State
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // const [isProcessing, setIsProcessing] = useState(false); // isProcessing is unused, removing it
  const [isUploading, setIsUploading] = useState(false);
  // const [disabled, setDisabled] = useState(false); // REMOVED: Redundant state variable
  const [isSaving, setIsSaving] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  
  const router = useRouter();

  // --- Mux API Interaction ---
  const getUploadUrl = async () => {
    try {
      setError(null);
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
      const message = err instanceof Error ? err.message : 'Failed to create upload';
      setError(message);
      setIsUploading(false);
      throw err;
    }
  };

  const handleSuccess = () => {
    console.log('✅ Upload complete!');
    setIsUploading(false);
    setUploadComplete(true);
  };

  const handleError = (error: any) => {
    console.error('❌ Upload error:', error);
    setError('Upload failed. Please try again.');
    setIsUploading(false);
    setUploadComplete(false);
  };

  // --- Database Save (Server Action Call) ---
  const handlePublish = async () => {
    if (!uploadId || !title || isSaving) {
      if (!title) setError("A video title is required before publishing.");
      if (!uploadId) setError("The video file has not been uploaded yet.");
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
        router.push('/');
      } else {
        throw new Error("Server action failed to return success.");
      }
    } catch (e) {
      console.error("Failed to save metadata:", e);
      setError("Failed to save video metadata. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Render Function with New UI ---
  const isFormDisabled = isUploading || isSaving || uploadComplete;
  
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      <div className="w-full max-w-3xl mx-auto flex flex-col min-h-screen relative bg-white shadow-2xl shadow-slate-300/50">
        
        {/* Header - Sticky & Polished */}
        <div className="flex justify-between items-center px-8 py-4 border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-50">
          <button 
            onClick={() => router.back()} 
            className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800"
            title="Go Back"
          >
            <IconArrowLeft />
          </button>
          
          <span className="font-extrabold text-xl tracking-tight text-slate-900">Publish New Content</span>
          
          {/* Publish Button - Disabled until Upload is done and Title exists */}
          <button 
            onClick={handlePublish}
            // Logic: Must have uploadId AND title AND not currently saving/uploading
            disabled={!uploadId || !title || isSaving || isUploading}
            className={`px-6 py-2 rounded-full text-sm font-extrabold transition-all duration-200 transform active:scale-95 shadow-md ${
              uploadId && title && !isSaving && !isUploading 
                ? 'bg-blue-600 text-white shadow-blue-500/40 hover:bg-blue-700' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <IconSpinner className="text-white" /> 
                Saving...
              </span>
            ) : 'Publish Content'}
          </button>
        </div>

        {/* Main Form Content */}
        <div className="flex-1 overflow-y-auto px-8 py-10 space-y-12">
          
          {/* Error Display */}
          {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-4">
                  <div className="mt-0.5 text-red-500"><IconInfo /></div>
                  <div className='flex-1'>
                    <p className="text-sm font-extrabold text-red-700">Error</p>
                    <p className="text-sm text-red-600 mt-1 leading-relaxed">{error}</p>
                  </div>
              </div>
          )}

          {/* Section 1: Metadata */}
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider pl-1">Video Title (Mandatory)</label>
              <input 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your video a clear and engaging title..." 
                className="w-full text-4xl font-extrabold placeholder:text-slate-200 border-b border-slate-100 outline-none focus:ring-0 focus:border-blue-500 transition-colors p-0 bg-transparent text-slate-900"
                autoFocus
                required
                disabled={isFormDisabled} // Using combined state here
              />
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider pl-1">Description (Optional)</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a detailed explanation or summary for viewers." 
                className="w-full min-h-[160px] resize-none text-base font-medium placeholder:text-slate-300 border-2 border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 p-4 bg-slate-50 text-slate-700 leading-relaxed transition-all"
                disabled={isFormDisabled} // Using combined state here
              />
            </div>
          </div>

          <div className="h-px bg-slate-100 w-full" />

          {/* Section 2: Upload Area */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-extrabold text-slate-600 uppercase tracking-wide pl-1">Media File Upload</label>
              {uploadId && <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full shadow-inner"><IconCheck className='inline mr-1 h-3 w-3'/> Upload Ready</span>}
            </div>
            
            {/* Conditional Rendering: Only render MuxUploader if upload is not complete */}
            {!uploadComplete && (
              <MuxUploader
                endpoint={getUploadUrl}
                onUploadStart={() => setIsUploading(true)} 
                onSuccess={handleSuccess}
                onError={handleError}
                // Optional: You might need to add style-based disabling logic for the input if title is empty
              />
            )}

            {/* Display message if upload is complete and saving is in progress */}
            {isSaving && (
                <div className="flex items-center justify-center p-6 text-blue-700 bg-blue-50 rounded-xl border border-blue-200">
                    <IconSpinner className="text-blue-500 mr-3 h-5 w-5" /> 
                    <span className="font-semibold">Saving Content to Library...</span>
                </div>
            )}

            {/* Display placeholder if upload is complete and waiting for Publish click */}
            {uploadComplete && !isSaving && (
                <div className="flex items-center justify-center p-6 text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
                    <IconCheck className="text-emerald-500 mr-3 h-5 w-5" /> 
                    <span className="font-semibold">File uploaded. Click **"Publish Content"** above to finish.</span>
                </div>
            )}
          </div>

          {/* Info / Hint */}
          <div className="bg-blue-50 p-5 rounded-xl flex items-start gap-4 border border-blue-200 shadow-inner">
              <div className="mt-1 text-blue-500">
                <IconInfo />
              </div>
              <div>
                <p className="text-sm font-extrabold text-blue-700">Asynchronous Processing</p>
                <p className="text-sm text-blue-600 mt-1 leading-relaxed">
                  Once you hit **'Publish Content'**, the video file is already in our system. Video processing begins instantly. The video status in the database will be <span className="font-mono bg-blue-100 text-blue-800 px-1 rounded text-xs">PROCESSING</span> until the webhook confirms it's ready for playback.
                </p>
              </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Icon Components (Included for completeness)
const IconArrowLeft = () => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

const IconCheck = ({ className }: {className?: string}) => (
  <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const IconSpinner = ({ className }: {className?: string}) => (
  <svg className={`animate-spin h-4 w-4 ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const IconInfo = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);