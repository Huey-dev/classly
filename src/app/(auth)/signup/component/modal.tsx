import Image from "next/image";

export default function Modal({
  show,
  onClose,
  onCreate,
}: {
  show: boolean;
  onClose: () => void;
  onCreate: () => void;
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl z-50 space-y-5">
        <div className="flex items-center gap-3">
          <Image src="/app-logo.png" alt="logo" width="34" height="34" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Choose your Path</h2>
            <p className="text-sm text-gray-500">Select how you want to continue</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition text-left"
          >
            <div>
              <div className="font-semibold text-gray-900">Continue Browsing</div>
              <div className="text-xs text-gray-500">Explore contents</div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={onCreate}
            className="w-full flex items-center justify-between px-4 py-3 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition text-left"
          >
            <div>
              <div className="font-semibold text-blue-700">Create a Course</div>
              <div className="text-xs text-gray-600">Set up your space and invite students</div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
