"use client";
import React, { useState } from "react";
import SignupForm from "./component/SignupForm";
import { SignupFormData } from "../../../../type";

const Page = () => {
   const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Called when user submits the form
  const handleSignupSubmit = async (data: SignupFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call
      await fakeSignupApi(data);
      alert("Signed up successfully!");
    } catch (err) {
      setError("Signup failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-4xl font-bold mb-6">Create an account</h1>
      <SignupForm onSubmit={handleSignupSubmit} loading={loading} error={error} />
    </div>
  );
};
export default Page;


async function fakeSignupApi(data: SignupFormData) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (data.email.includes("@")) {
        resolve(true);
      } else {
        reject(new Error("Invalid email"));
      }
    }, 1500);
  });
}