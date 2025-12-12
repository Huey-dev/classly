'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveVideoToLibrary } from '../../../lib/actions';

type CourseForm = {
  title: string;
  description: string;
  category: string;
  priceAda: string;
};

type VideoDraft = {
  id: string;
  title: string;
  description: string;
  file?: File;
  duration?: number | null;
  size?: number;
  status: 'idle' | 'uploading' | 'uploaded' | 'error';
  progress: number;
  error?: string;
  previewUrl?: string;
  format?: string;
};

type SectionDraft = {
  id: string;
  title: string;
  description: string;
  videos: VideoDraft[];
};

type ToastKind = 'course_created' | 'video_uploaded' | 'section_added' | 'course_updated';

type ExistingCourse = {
  id: string;
  title: string;
  description: string | null;
  language?: string | null;
  coverImage?: string | null;
  videoCount?: number;
};

const categoryOptions = [
  'Web Development',
  'Mobile Development',
  'Data Science',
  'Design',
  'Business',
  'Other',
];

export default function UploadClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attachCourseId = searchParams.get('courseId');
  const isAttachMode = Boolean(attachCourseId);
  const [attachCourse, setAttachCourse] = useState<ExistingCourse | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoAccordionOpen, setVideoAccordionOpen] = useState(false);
  const [sections, setSections] = useState<SectionDraft[]>([]);
  const [overlay, setOverlay] = useState<{ open: boolean; text: string }>({ open: false, text: '' });
  const [toast, setToast] = useState<ToastKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingDraft, setSavingDraft] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [baseCourse, setBaseCourse] = useState<ExistingCourse | null>(null);
  const uploadCancels = useRef<Record<string, () => void>>({});
  const [savingCourse, setSavingCourse] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setError: setFormError,
    clearErrors,
    reset,
    watch,
  } = useForm<CourseForm>({
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      category: '',
      priceAda: '',
    },
  });

  const watchedForm = watch();
  const hasQueuedVideos = useMemo(
    () => sections.some((section) => section.videos.some((video) => video.file)),
    [sections]
  );
  const imageRequired = !isAttachMode;
  const formReady = isAttachMode ? true : isValid;
  const draftKey = useMemo(
    () => `classly_draft_course_${attachCourseId || 'new'}`,
    [attachCourseId]
  );
  const hasFormChanges = useMemo(() => {
    if (!isAttachMode || !baseCourse) return false;
    return (
      (watchedForm.title || '') !== (baseCourse.title || '') ||
      (watchedForm.description || '') !== (baseCourse.description || '') ||
      (watchedForm.category || '') !== (baseCourse.language || '') ||
      (!!imageFile || (!!imagePreview && imagePreview !== baseCourse.coverImage))
    );
  }, [isAttachMode, baseCourse, watchedForm.title, watchedForm.description, watchedForm.category, imageFile, imagePreview]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!attachCourseId) return;
    let active = true;
    setLoadingCourse(true);
    (async () => {
      try {
        const res = await fetch(`/api/courses/${attachCourseId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load course');
        }
        const data = await res.json();
        if (!active) return;
        setAttachCourse({
          id: data.id,
          title: data.title,
          description: data.description ?? null,
          language: data.language ?? null,
          coverImage: data.coverImage ?? null,
          videoCount: data.videoCount ?? 0,
        });
        setBaseCourse({
          id: data.id,
          title: data.title,
          description: data.description ?? null,
          language: data.language ?? null,
          coverImage: data.coverImage ?? null,
          videoCount: data.videoCount ?? 0,
        });
          reset({
            title: data.title || '',
            description: data.description || '',
            category: data.language || '',
            priceAda: data.priceAda ? String(data.priceAda) : '',
          });
        if (data.coverImage) {
          setImagePreview(data.coverImage);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load course');
      } finally {
        if (active) setLoadingCourse(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [attachCourseId, reset]);

  useEffect(() => {
    if (attachCourseId) {
      setVideoAccordionOpen(true);
    }
  }, [attachCourseId]);

  // Restore draft on mount
  useEffect(() => {
    if (draftLoaded) return;
    const raw = typeof window !== 'undefined' ? localStorage.getItem(draftKey) : null;
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data.form) {
          reset({
            title: data.form.title || '',
            description: data.form.description || '',
            category: data.form.category || '',
          });
        }
        if (Array.isArray(data.sections)) {
          setSections(data.sections);
        }
        if (data.imagePreview) {
          setImagePreview(data.imagePreview);
        }
        setDraftLoaded(true);
      } catch {
        // ignore corrupted draft
      }
    } else {
      setDraftLoaded(true);
    }
  }, [draftKey, reset, draftLoaded]);

  // Autosave draft
  useEffect(() => {
    if (!draftLoaded) return;
    const handle = setTimeout(() => {
      try {
        setSavingDraft('saving');
        const payload = {
          form: {
            title: watchedForm.title || '',
            description: watchedForm.description || '',
            category: watchedForm.category || '',
          },
          sections,
          imagePreview,
          ts: Date.now(),
        };
        localStorage.setItem(draftKey, JSON.stringify(payload));
        setSavingDraft('saved');
        setLastSavedAt(Date.now());
      } catch {
        setSavingDraft('error');
      }
    }, 1200);
    return () => clearTimeout(handle);
  }, [sections, imagePreview, draftKey, draftLoaded, watchedForm.title, watchedForm.description, watchedForm.category]);

  // Warn on unload when unsaved changes in edit mode
  useEffect(() => {
    if (!isAttachMode) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (hasFormChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [hasFormChanges, isAttachMode]);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);

    if (isAttachMode && loadingCourse) {
      setError('Course is still loading. Please wait a moment.');
      return;
    }

    if (isAttachMode && attachCourseId && !attachCourse) {
      setError('Unable to load this course. Please retry or create a new one.');
      return;
    }

    if (!attachCourseId && !imageFile) {
      setFormError('title', { type: 'manual', message: '' }); // trigger form invalid state
      setError('Course image is required (JPEG, PNG, or WebP, max 5MB).');
      return;
    }

    const pendingVideos = sections.flatMap((section, sectionIdx) =>
      section.videos
        .filter((video) => video.file)
        .map((video) => ({ ...video, sectionTitle: section.title || `Section ${sectionIdx + 1}` }))
    );

    if (pendingVideos.some((v) => !v.title.trim())) {
      setError('Please add a title for each video you plan to upload.');
      return;
    }

    setCreating(true);
    setOverlay({
      open: true,
      text: pendingVideos.length
        ? isAttachMode
          ? 'Uploading videos...'
          : 'Creating your course and uploading videos...'
        : isAttachMode
          ? 'Updating course...'
          : 'Creating your course...',
    });

    try {
      let courseIdToUse = attachCourseId;

      if (!courseIdToUse) {
        const courseRes = await fetch('/api/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: values.title.trim(),
            description: values.description.trim(),
            coverImage: null,
            category: values.category,
            priceAda: values.priceAda ? Number(values.priceAda) : undefined,
          }),
        });

        if (!courseRes.ok) {
          const data = await courseRes.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to create course');
        }

        const course = await courseRes.json();
        courseIdToUse = course.id;
        setToast('course_created');
      }

      if (imageFile && courseIdToUse) {
        setOverlay({ open: true, text: isAttachMode ? 'Updating course image...' : 'Uploading course image...' });
        await uploadCourseImage(courseIdToUse, imageFile);
      }

      if (pendingVideos.length && courseIdToUse) {
        let partNumber = (attachCourse?.videoCount ?? 0) + 1;
        for (let i = 0; i < pendingVideos.length; i++) {
          const video = pendingVideos[i];
          setOverlay({
            open: true,
            text: `Uploading videos... (${i + 1}/${pendingVideos.length})`,
          });
          await uploadVideo(video, courseIdToUse, video.sectionTitle, partNumber);
          partNumber += 1;
        }
      }

      setOverlay({ open: true, text: 'Taking you to your course...' });
      if (courseIdToUse) {
        setTimeout(() => router.push(`/course/${courseIdToUse}`), 800);
      }
    } catch (e) {
      setOverlay({ open: false, text: '' });
      setCreating(false);
      setError(e instanceof Error ? e.message : 'Something went wrong while creating the course.');
    }
  });

  const handleSaveCourseDetails = async () => {
    if (!attachCourseId) return;
    setSavingCourse(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${attachCourseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: watchedForm.title,
          description: watchedForm.description,
          coverImage: imagePreview,
          priceAda: watchedForm.priceAda ? Number(watchedForm.priceAda) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update course');
      }
      setBaseCourse({
        ...(baseCourse || { id: attachCourseId, title: '', description: '' }),
        title: watchedForm.title,
        description: watchedForm.description,
        coverImage: imagePreview || null,
        language: watchedForm.category,
      });
      setToast('course_updated');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update course.');
    } finally {
      setSavingCourse(false);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Image must be JPEG, PNG, or WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.');
      return;
    }
    setError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    clearErrors();
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: randomId(),
        title: '',
        description: '',
        videos: [],
      },
    ]);
    setToast('section_added');
  };

  const removeSection = (sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  };

  const updateSection = (sectionId: string, payload: Partial<SectionDraft>) => {
    setSections((prev) =>
      prev.map((section) => (section.id === sectionId ? { ...section, ...payload } : section))
    );
  };

  const addVideo = (sectionId: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              videos: [
                ...section.videos,
                {
                  id: randomId(),
                  title: '',
                  description: '',
                  status: 'idle',
                  progress: 0,
                },
              ],
            }
          : section
      )
    );
  };

  const removeVideo = (sectionId: string, videoId: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, videos: section.videos.filter((video) => video.id !== videoId) }
          : section
      )
    );
  };

  const updateVideo = (sectionId: string, videoId: string, payload: Partial<VideoDraft>) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              videos: section.videos.map((video) =>
                video.id === videoId ? { ...video, ...payload } : video
              ),
            }
          : section
      )
    );
  };

  const handleVideoFile = async (sectionId: string, videoId: string, file?: File | null) => {
    if (!file) return;
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowed.includes(file.type)) {
      setError('Only MP4, WebM, or MOV files are supported.');
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setError(`Videos must be under 200MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
      return;
    }
    setError(null);
    const duration = await readVideoDuration(file);
    updateVideo(sectionId, videoId, {
      file,
      size: file.size,
      duration,
      format: file.type,
      previewUrl: URL.createObjectURL(file),
    });
  };

  const uploadCourseImage = async (courseId: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`/api/courses/${courseId}/image`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to upload course image.');
    }
    return res.json();
  };

  const sectionIdFor = (videoId: string) => {
    const section = sections.find((s) => s.videos.some((v) => v.id === videoId));
    return section?.id || '';
  };

  const uploadVideo = async (
    video: VideoDraft & { sectionTitle?: string },
    courseId: string,
    sectionTitle?: string,
    partNumber?: number
  ) => {
    if (!video.file) return;
    const sectionId = sectionIdFor(video.id);
    updateVideoState(video.id, 'uploading');

    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileType: video.file.type }),
      });
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to get upload URL');
      }
      const { uploadUrl, uploadId } = await uploadRes.json();

      await uploadFileWithProgress(
        uploadUrl,
        video.file,
        (progress) => {
          if (sectionId) {
            updateVideo(sectionId, video.id, { progress });
          }
        },
        (cancelFn) => {
          uploadCancels.current[video.id] = () => {
            cancelFn();
            updateVideo(sectionId, video.id, { status: 'error', error: 'Upload canceled', progress: 0 });
          };
        }
      );

      await saveVideoToLibrary({
        title: video.title || 'Untitled lesson',
        description: video.description,
        muxUploadId: uploadId,
        courseId,
        partNumber,
        sectionTitle,
        durationSeconds: video.duration ? Math.round(video.duration) : undefined,
        fileSizeBytes: video.size,
        fileFormat: video.file.type,
      });

      updateVideoState(video.id, 'uploaded');
      setToast('video_uploaded');
      delete uploadCancels.current[video.id];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      updateVideoState(video.id, 'error', message);
      throw err;
    }
  };

  const updateVideoState = (videoId: string, status: VideoDraft['status'], errorText?: string) => {
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        videos: section.videos.map((video) =>
          video.id === videoId ? { ...video, status, progress: status === 'uploaded' ? 100 : video.progress, error: errorText } : video
        ),
      }))
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Course builder</p>
            <h1 className="text-3xl font-bold text-slate-900">
              {isAttachMode ? `Edit course${attachCourse?.title ? `: ${attachCourse.title}` : ''}` : 'Create your course'}
            </h1>
            <p className="text-sm text-slate-600">
              Start with course details. Add videos now or later - your choice.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500">
              {savingDraft === 'saving' && '💾 Saving draft...'}
              {savingDraft === 'saved' && lastSavedAt && `✓ Draft saved • ${new Date(lastSavedAt).toLocaleTimeString()}`}
              {savingDraft === 'error' && '⚠️ Could not save draft'}
            </div>
            {isAttachMode && (
              <button
                type="button"
                onClick={handleSaveCourseDetails}
                disabled={!hasFormChanges || savingCourse}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  !hasFormChanges || savingCourse
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {savingCourse ? 'Saving...' : 'Save changes'}
              </button>
            )}
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-blue-600"
            >
              <ArrowLeft />
              Back
            </button>
          </div>
        </div>

        {isAttachMode && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
            <CheckCircle />
            <div className="text-sm">
              <p className="font-semibold">
                Adding videos to {attachCourse?.title || 'existing course'}
              </p>
              {attachCourse?.videoCount !== undefined && (
                <p className="text-xs">
                  {attachCourse.videoCount} existing video{attachCourse.videoCount === 1 ? '' : 's'}
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Course creation */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <IconBook />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Course details</h2>
                <p className="text-sm text-slate-600">Required to create your course.</p>
              </div>
            </div>
            {isAttachMode && (
              <p className="text-xs text-slate-500">
                Viewing details from your existing course. Changes here are not saved in attach mode.
              </p>
            )}

            <div className="grid gap-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                  Course title <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('title', {
                    required: 'Course title is required',
                    minLength: { value: 5, message: 'Minimum 5 characters' },
                  })}
                  placeholder="Enter course title"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.title && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle /> {errors.title.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('description', {
                    required: 'Course description is required',
                    minLength: { value: 20, message: 'Minimum 20 characters' },
                  })}
                  placeholder="Provide a detailed description of your course"
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.description && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle /> {errors.description.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('category', { required: 'Select a category' })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Choose a category
                  </option>
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.category && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle /> {errors.category.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-800">
                  Price in ADA
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  {...register('priceAda', {
                    validate: (v) =>
                      v === '' || (Number(v) >= 0 && Number.isFinite(Number(v))) || 'Price must be a valid number',
                  })}
                  placeholder="e.g., 25 (leave blank for free)"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500">
                  Set a price to make this a paid course (Escrow demo supports test ADA). Leave blank to keep it free.
                </p>
                {errors.priceAda && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle /> {errors.priceAda.message}</p>}
              </div>
            </div>
          </section>

          {/* Image upload */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <IconImage />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Course image</h2>
                <p className="text-sm text-slate-600">Upload course thumbnail (recommended: 1280x720px).</p>
              </div>
            </div>

            <div className="grid md:grid-cols-[240px_1fr] gap-4">
              <div className="aspect-video rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                {imagePreview ? (
                  <img src={imagePreview} alt="Course cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-slate-500 text-sm">
                    <UploadCloud />
                    <p className="mt-2">No image selected</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                  Upload image {imageRequired && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="w-full text-sm file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold file:cursor-pointer border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-500">
                  {imageRequired
                    ? 'Required for new courses. Max size 5MB. JPEG, PNG, or WebP only.'
                    : 'Optional update. Max size 5MB. JPEG, PNG, or WebP only.'}
                </p>
              </div>
            </div>
          </section>

          {/* Video upload - collapsible */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <button
              type="button"
              onClick={() => setVideoAccordionOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-6 py-4"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <PlusCircle />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    Add videos to course (Optional - can be added later)
                  </p>
                  <p className="text-sm text-slate-600">
                    Create sections and upload multiple videos per section.
                  </p>
                </div>
              </div>
              <ArrowRight className={`transition-transform ${videoAccordionOpen ? 'rotate-90' : ''}`} />
            </button>

            {videoAccordionOpen && (
              <div className="border-t border-slate-200 p-6 space-y-4">
                {sections.length === 0 && (
                  <div className="border border-dashed border-slate-200 rounded-xl p-4 text-sm text-slate-600 bg-slate-50">
                    No sections yet. Add a section to begin.
                  </div>
                )}

                {sections.map((section, sectionIdx) => (
                  <div key={section.id} className="border border-slate-200 rounded-xl p-4 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <label className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                          Section title <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={section.title}
                          onChange={(e) => updateSection(section.id, { title: e.target.value })}
                          placeholder="e.g., Introduction, HTML Fundamentals"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <textarea
                          value={section.description}
                          onChange={(e) => updateSection(section.id, { description: e.target.value })}
                          placeholder="Brief description of this section"
                          rows={2}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSection(section.id)}
                        className="text-slate-500 hover:text-red-600"
                        title="Remove section"
                      >
                        <Trash />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {section.videos.map((video) => (
                        <div key={video.id} className="border border-slate-200 rounded-lg p-3 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-2">
                              <input
                                value={video.title}
                                onChange={(e) =>
                                  updateVideo(section.id, video.id, { title: e.target.value })
                                }
                                placeholder="e.g., How to set up IDE"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <textarea
                                value={video.description}
                                onChange={(e) =>
                                  updateVideo(section.id, video.id, { description: e.target.value })
                                }
                                placeholder="Brief description of this video"
                                rows={2}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />

                              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <label className="flex-1 flex items-center gap-3 text-sm text-slate-700">
                                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600">
                                    <UploadCloud />
                                  </span>
                                  <input
                                    type="file"
                                    accept="video/mp4,video/webm"
                                    onChange={(e) =>
                                      handleVideoFile(section.id, video.id, e.target.files?.[0])
                                    }
                                    className="w-full text-xs"
                                  />
                                </label>
                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                  <PlayCircle />
                                  <span>{formatDurationLabel(video.duration)}</span>
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Max 200MB • MP4, WebM, or MOV • Ideal duration 2-20 minutes
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeVideo(section.id, video.id)}
                              className="text-slate-400 hover:text-red-600"
                              title="Remove video"
                            >
                              <Trash />
                            </button>
                          </div>

                          {video.status !== 'idle' && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                <span>
                                  {video.status === 'uploading'
                                    ? 'Uploading...'
                                    : video.status === 'uploaded'
                                    ? 'Uploaded'
                                    : 'Error'}
                                </span>
                                <span className="tabular-nums">{Math.round(video.progress)}%</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    video.status === 'error'
                                      ? 'bg-red-500'
                                      : 'bg-blue-600'
                                  }`}
                                  style={{ width: `${Math.round(video.progress)}%` }}
                               />
                              </div>
                              {video.status === 'uploading' && uploadCancels.current[video.id] && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    uploadCancels.current[video.id]?.();
                                  }}
                                  className="text-xs text-red-600 underline"
                                >
                                  Cancel upload
                                </button>
                              )}
                              {video.error && (
                                <p className="text-xs text-red-600 flex items-center gap-1">
                                  <AlertCircle /> {video.error}
                                </p>
                              )}
                              {video.status === 'uploaded' && (
                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                                  {video.previewUrl && (
                                    <video
                                      src={video.previewUrl}
                                      className="w-20 h-12 rounded-md object-cover border border-slate-200"
                                      muted
                                      controls={false}
                                    />
                                  )}
                                  {video.duration !== undefined && <span>Duration: {formatDurationLabel(video.duration)}</span>}
                                  {video.size !== undefined && <span>Size: {(video.size / (1024 * 1024)).toFixed(1)}MB</span>}
                                  {video.format && <span>Format: {video.format.replace('video/', '').toUpperCase()}</span>}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addVideo(section.id)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
                      >
                        <PlusCircle />
                        Add Video to Section
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addSection}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100"
                >
                  <PlusCircle />
                  Add New Section
                </button>
              </div>
            )}
          </section>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="text-sm text-slate-600">
              {isAttachMode
                ? 'Upload new sections and videos to this course whenever you are ready.'
                : 'You can create the course without videos and add them later.'}
            </div>
            <button
              type="submit"
              disabled={!formReady || creating || loadingCourse || (!imageFile && !isAttachMode)}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold transition ${
                !formReady || creating || loadingCourse || (!imageFile && !isAttachMode)
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {creating
                ? 'Working...'
                : isAttachMode
                  ? hasQueuedVideos
                    ? 'Upload to course'
                    : 'Update course'
                  : hasQueuedVideos
                    ? 'Create & upload'
                    : 'Create course'}
              <ArrowRight />
            </button>
          </div>
        </form>
      </div>

      {overlay.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-50 px-4">
          <Spinner />
          <p className="text-white text-lg font-semibold text-center">{overlay.text}</p>
        </div>
      )}

      {toast && <SuccessToast kind={toast} />}
    </div>
  );
}

function SuccessToast({ kind }: { kind: ToastKind }) {
  const messages: Record<ToastKind, string> = {
    course_created: 'Course created successfully!',
    video_uploaded: 'Video uploaded successfully!',
    section_added: 'Section added successfully!',
    course_updated: 'Course updated successfully!',
  };

  return (
    <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-3 rounded-lg bg-emerald-500 text-white px-4 py-3 shadow-lg">
        <CheckCircle />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{messages[kind]}</span>
        </div>
      </div>
    </div>
  );
}

async function uploadFileWithProgress(
  url: string,
  file: File,
  onProgress: (progress: number) => void,
  registerCancel: (fn: () => void) => void
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    };
    xhr.onload = () => {
      registerCancel(() => {});
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };
    xhr.onerror = () => {
      registerCancel(() => {});
      reject(new Error('Network error during upload'));
    };
    xhr.onabort = () => {
      registerCancel(() => {});
      reject(new Error('Upload canceled'));
    };
    registerCancel(() => xhr.abort());
    xhr.send(file);
  });
}

function formatDurationLabel(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return '00:00';
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function readVideoDuration(file: File) {
  return new Promise<number | null>((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration || null);
    };
    video.onerror = () => resolve(null);
    video.src = URL.createObjectURL(file);
  });
}

const ArrowLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5l7 7-7 7" />
  </svg>
);

const UploadCloud = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 16l-4-4-4 4" />
    <path d="M12 12v9" />
    <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 104 16.3" />
  </svg>
);

const PlusCircle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </svg>
);

const Trash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);

const CheckCircle = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const Spinner = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="#3b82f6"
      strokeWidth="4"
      strokeDasharray="32"
      strokeLinecap="round"
    >
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
    </circle>
  </svg>
);

const IconImage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

const IconBook = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 19.5a2.5 2.5 0 012.5-2.5H20" />
    <path d="M4 4h16v15H6.5A2.5 2.5 0 004 21.5z" />
  </svg>
);

const PlayCircle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M10 8l6 4-6 4z" />
  </svg>
);

const AlertCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);
