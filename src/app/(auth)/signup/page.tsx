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
    <div className="min-h-screen flex items-center bg-[#f6faff] dark:bg-gray-900 justify-center px-4 sm:px-6 lg:px-8">
      {/* display success message */}
      {showToast && (
        <Toast message="Account created successfully, Please wait...!" />
      )}
      <Modal
        show={showModal}
        onClose={() => router.push("/")}
        onCreate={() => router.push("/upload")}
      />
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
        <div className="flex items-center justify-center">
          <Image src="/app-logo.png" alt="Classly logo" width={48} height={48} />
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">Create Account</p>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome!</h2>
          <p className="text-sm text-gray-500">Enter your information or continue with social</p>
        </div>

        <SignupForm onSubmit={handleSubmit} loading={loading} error={error} />

        <div className="text-center text-sm text-gray-500 dark:text-gray-300">Or continue with</div>
        <div className="flex items-center justify-center">
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full sm:w-auto px-5 py-3 rounded-lg border border-gray-200 bg-white flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition"
          >
            <Image src="/google.svg" alt="Google" width={18} height={18} />
            <span className="text-sm font-medium text-gray-700">Sign up with Google</span>
          </button>
        </div>

        <div className="text-center mt-2 text-sm text-gray-600 dark:text-gray-300">
          Already have an account?{" "}
          <Link href="/signin" className="font-medium text-blue-600 hover:text-blue-800">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Page;
