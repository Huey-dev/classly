import Link from "next/link";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-400 p-4">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">Welcome to Aula!</h1>
        <p className="text-gray-600 mb-6">
          What’s your next move? Continue browsing our content or create your own digital classroom.
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <Link href="/">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Continue Browsing
            </button>
          </Link>
          <Link href="/onboarding">
            <button className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">
              Create a Classroom
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}