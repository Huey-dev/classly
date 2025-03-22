


export default async function SignIn() {

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-900">
          Sign In / Sign Up
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email to receive a magic link for sign in.
        </p>
        <form method="post" action="/api/auth/signin/email" className="mt-6">
          {/* <input name="csrfToken" type="hidden" defaultValue={csrfToken || ''} /> */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-center">
            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Send Signin Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
