"use client";
import { signInAction } from "@/app/actions/signInAction";

export default function SigninBtn() {
  

  return (
    <div className="flex p-4 justify-center items-center h-screen bg-gray-300"> {/* Added background for visual clarity */}
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md"> {/* The Wrapper */}
        <form
          action={signInAction}
          className="flex flex-col gap-4"
        >
          <input
            name="email"
            type="email"
            placeholder="Enter your email"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 p-4 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
           Sign In or Create Account
          </button>
        </form>
      </div>
    </div>
  );
}