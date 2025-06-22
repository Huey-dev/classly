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
    <div className="fixed inset-0 z-40 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-sm shadow-xl z-50">
        <h2 className="text-xl font-bold mb-2">Welcome to Aula! 🎉</h2>
        <p className="mb-4">What would you like to do next?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Continue Browsing
          </button>
          <button
            onClick={onCreate}
            className="px-4 py-2 bg-[#ED1C24] text-white hover:bg-red-700 rounded"
          >
            Create Classroom
          </button>
        </div>
      </div>
    </div>
  );
}
