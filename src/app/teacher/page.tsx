export default function CreateClassroomPage() {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 p-4">
        <div className="w-full max-w-lg bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
            Create Your Classroom
          </h1>
          <form className="flex flex-col gap-4">
            <input
              type="text"
              name="classroomName"
              placeholder="Classroom Name"
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <textarea
              name="classroomDescription"
              placeholder="Describe your classroom..."
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 p-4 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Create Classroom
            </button>
          </form>
        </div>
      </div>
    );
  }