"use client";
import React, { useState } from "react";
import SigninForm from "./component/SigninForm";
import { SignupFormData } from "../../../../type";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import SignIn from "@/app/component/signin";
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
    <div className="min-h-screen flex items-center  bg-white justify-center  px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div className="flex items-center">
          <Image src="/logo.png" alt="logo" width="37" height="37" />
          <span className="font-extrabold text-lg ">aula</span>
        </div>
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in
          </h2>
        </div>

        <SigninForm
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
          success={success}
        />

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-blue-600 hover:text-blue-800"
            >
              Sign up
            </Link>
          </p>
        </div>
        <div className="flex item-center justify-center">
          {" "}
          <SignIn />
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
