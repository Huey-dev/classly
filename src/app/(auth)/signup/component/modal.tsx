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
    <div className="fixed inset-0 z-40 bg-white bg-opacity-70 flex items-center justify-center px-2">
      <div className="bg-white rounded-lg p-6 md:p-6 w-full max-w-md shadow-xl z-50">
        <div>
          {" "}
          <div className="flex items-center">
            <Image src="/logo.png" alt="logo" width="27" height="27" />

            <h2 className="text-xl font-bold mt-1 mb-1">Welcome to Aula! </h2>
          </div>
          <p className="text-sm md:text-sm font-light">
            What would you like to do next?
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-2 px-1 mt-4">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-2 bg-white shadow-md hover:bg-gray-300 rounded text-sm"
          >
            Continue Browsing
          </button>
          <button
            onClick={onCreate}
            className="w-full sm:w-auto px-8 py-2 bg-[#ED1C24] shadow-md text-white hover:bg-red-700 rounded text-sm"
          >
            Create Classroom
          </button>
        </div>
      </div>
    </div>
  );
}
