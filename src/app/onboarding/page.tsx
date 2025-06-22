"use client"
import React, { useState } from "react";
import Form from "./component/Form";
import { OnboardingFormData } from "../../../type";

const page = () => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: OnboardingFormData) => {
    setLoading(true);
  };
  return (
    <div>
      <h1>Setup Classroom</h1>
      <Form onSubmit={handleSubmit} loading={loading} />
    </div>
  );
};

export default page;
