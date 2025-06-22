"use client";
import React, { useState, useRef, useEffect } from "react";
import SignupForm from "./component/SignupForm";
import { SignupFormData } from "../../../../type";
import Toast from "./component/toast";
import Modal from "./component/modal" ;
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
const Page = () => {
  // State to manage form submission status
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showToast, setShowToast] =  useState<boolean>(false)
  const [showModal, setShowModal] =  useState<boolean>(true)
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
    <div className="min-h-screen flex items-center  bg-white justify-center  px-4 sm:px-6 lg:px-8">
        {/* display success message */}
          {showToast && <Toast message="Account created successfully, Please wait...!" />}
      <Modal
        show={showModal}
        onClose={() => router.push("/")}
        onCreate={() => router.push("/dashboard/create")}
      />
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div className="flex items-center">
          <Image src="/logo.png" alt="logo" width="37" height="37" />
          <span className="font-extrabold text-lg ">aula</span>
        </div>
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign up
          </h2>
        </div>

        <SignupForm onSubmit={handleSubmit} loading={loading} error={error} />

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="font-medium text-blue-600 hover:text-blue-800"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    
 
    </div>
  );
};

export default Page;
