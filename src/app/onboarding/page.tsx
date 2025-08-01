"use client";
import React, { useState } from "react";
import Form from "./component/Form";
import { OnboardingFormData } from "../../../type";

const page = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>();
  const [success, setSuccess] = useState<boolean>(false);
  const [formData, setFormData] = useState<OnboardingFormData>({
    image: null,
    name: "",
    description: "",
  });
  const handleSubmit = async (data: OnboardingFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/classroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert("class created");
      } else {
        setError(data.error || "Signup failed.");
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <h1 className="items-center justify-center flex font-semibold text-xl pt-12 ">
        Setup wizard
      </h1>
      <Form onSubmit={handleSubmit} error={error} loading={loading} />
    </div>
  );
};

export default page;
