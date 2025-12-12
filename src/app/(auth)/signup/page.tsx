"use client";
import React, { useState, useRef, useEffect } from "react";
import SignupForm from "./component/SignupForm";
import { SignupFormData } from "../../../../type";
import Toast from "./component/toast";
import Modal from "./component/modal";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import SignIn from "@/app/component/signin";
const Page = () => {
  // State to manage form submission status
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  // useRouter hook to handle navigation
  const router = useRouter();
  const timer = useRef<NodeJS.Timeout | null>(null);
  // Function to handle form submission
  const handleSubmit = async (formData: SignupFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setShowToast(true);
        timer.current = setTimeout(() => {
          setShowToast(false);
          setShowModal(true);
        }, 2000);
      } else {
        setError(data.error || "Signup failed.");
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f6faff] dark:bg-gray-900 grid md:grid-cols-2 grid-cols-1">
      {showToast && <Toast message="Account created successfully, Please wait...!" />}
      <Modal show={showModal} onClose={() => router.push("/")} onCreate={() => router.push("/upload")} />

      <section className="flex items-center justify-center bg-white dark:bg-gray-800 px-6 md:px-12">
        <div className="w-full max-w-md space-y-6 py-12">
          <div className="flex items-center gap-3">
            <Image src="/app-logo.png" alt="Classly logo" width={48} height={48} />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Create account</p>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Join Classly</h2>
            </div>
          </div>

          <SignupForm onSubmit={handleSubmit} loading={loading} error={error} />

          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-300">
            <span className="flex-1 h-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
            <span className="whitespace-nowrap">Or continue with</span>
            <span className="flex-1 h-px bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
          </div>
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full px-5 py-3 rounded-lg border border-gray-200 bg-white flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition"
          >
            <Image src="/google.svg" alt="Google" width={18} height={18} />
            <span className="text-sm font-medium text-gray-700">Sign up with Google</span>
          </button>

          <div className="text-center mt-2 text-sm text-gray-600 dark:text-gray-300">
            Already have an account?{" "}
            <Link href="/signin" className="font-medium text-blue-600 hover:text-blue-800">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="hidden md:flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 text-white px-8">
        <div className="text-center space-y-4">
          <Image src="/app-logo.png" alt="Classly logo" width={72} height={72} className="mx-auto" />
          <h3 className="text-2xl font-semibold">Classly</h3>
          <p className="text-sm text-blue-100 max-w-sm mx-auto">
            Learn and teach with escrow-protected payouts. Create your account to get started.
          </p>
        </div>
      </section>
    </main>
  );
};

export default Page;
