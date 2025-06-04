"use client";
import React, { useState } from "react";
import SigninForm from "./component/SigninForm"
import { SignupFormData } from "../../../../type";
import { useRouter } from 'next/navigation';
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
        router.push('/');
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
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-4xl font-bold mb-6">Create an account</h1>
      <SigninForm
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        success={success}
      />
    </div>
  );
};

export default Page;
