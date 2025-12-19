"use client";
import React, { useState } from "react";
import SigninForm from "./component/SigninForm";
import { SignupFormData } from "../../../../type";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import GoogleSignInButton from "@/app/component/signin";

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
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        console.log("Signin successful:", data);
        router.push("/");
        // Optionally redirect or show a success message
      } else {
        setError(data.error || "Signin failed");
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6faff] dark:bg-gray-900 grid md:grid-cols-2 grid-cols-1">
      <div className="flex items-center justify-center bg-white dark:bg-gray-800 px-6 md:px-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center gap-3">
            <Image
              src="/app-logo.png"
              alt="Classly logo"
              width={48}
              height={48}
            />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Welcome back
              </p>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Sign in to Classly
              </h2>
            </div>
          </div>

          <SigninForm
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
            success={success}
          />

          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-300">
            <span
              className="flex-1 h-px bg-gray-200 dark:bg-gray-700"
              aria-hidden="true"
            />
            <span className="whitespace-nowrap">Or continue with</span>
            <span
              className="flex-1 h-px bg-gray-200 dark:bg-gray-700"
              aria-hidden="true"
            />
          </div>
          <GoogleSignInButton />

          <div className="text-center mt-2 text-sm text-gray-600 dark:text-gray-300">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-blue-600 hover:text-blue-800"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 text-white px-8">
        <div className="text-center space-y-4">
          <Image
            src="/app-logo.png"
            alt="Classly logo"
            width={72}
            height={72}
            className="mx-auto"
          />
          <h3 className="text-2xl font-semibold">Classly</h3>
          <p className="text-sm text-blue-100 max-w-sm mx-auto">
            Decentralized learning with escrow-protected payouts. Sign in to
            continue your journey.
          </p>
        </div>
      </div>
    </main>
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
