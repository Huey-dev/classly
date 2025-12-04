"use client";
import React, { useState } from "react";
import SigninForm from "./component/SigninForm";
import { SignupFormData } from "../../../../type";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
const Page = () => {
  // State to manage form submission status
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  // useRouter hook to handle navigation
  const router = useRouter();
  // Function to handle form submission
  const handleSubmit = async (formData: SignupFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        console.log("Signup successful:", data);
        router.push("/");
        // Optionally redirect or show a success message
      } else {
        setError(data.error || "Signup failed");
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center bg-[#f6faff] dark:bg-gray-900 justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
        <div className="flex items-center justify-center">
          <Image src="/app-logo.png" alt="Classly logo" width={48} height={48} />
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">Login</p>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back!</h2>
          <p className="text-sm text-gray-500">Please login to continue</p>
        </div>

        <SigninForm
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          success={success}
        />

        <div className="text-center text-sm text-gray-600 dark:text-gray-300">
          Forgot Password
        </div>

        <div className="text-center text-sm text-gray-500 dark:text-gray-300">Or continue with</div>
        <div className="flex items-center justify-center">
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full sm:w-auto px-5 py-3 rounded-lg border border-gray-200 bg-white flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition"
          >
            <Image src="/google.svg" alt="Google" width={18} height={18} />
            <span className="text-sm font-medium text-gray-700">Sign in with Google</span>
          </button>
        </div>

        <div className="text-center mt-2 text-sm text-gray-600 dark:text-gray-300">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-800">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Page;

{
  /* <SigninForm
  onSubmit={handleSubmit}
  loading={loading}
  error={error}
  success={success}
/> */
}
