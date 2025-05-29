"use client";
import React, { useState } from "react";
import SignupForm from "./component/SignupForm";
import { SignupFormData } from "../../../../type";

const Page = () => {
  const [formData, setFormData] = useState<SignupFormData>({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // const handleChange = (
  //   e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  // ) => {
  //   const { name, value } = e.target;
  //   setFormData((prev) => ({ ...prev, [name]: value }));
  // };

 async function handleSubmit() {
  fetch("api/auth/signup", {
    method:"POST",
    body: JSON.stringify({
      data: formData,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  })
 }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-4xl font-bold mb-6">Create an account</h1>
      <SignupForm
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
      />
    </div>
  );
};

export default Page;
