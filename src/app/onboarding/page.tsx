"use client"
import React, { useState } from "react";
import Form from "./component/Form";
import { OnboardingFormData } from "../../../type";

const page = () => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: OnboardingFormData) => {
    setLoading(true);
    console.log(data);
    setTimeout(() => setLoading(false), 1000);
  };
  return (
    <div className="bg-white min-h-screen">
      <h1 className="items-center justify-center flex font-semibold text-xl pt-12 ">Setup wizard</h1>
      <Form onSubmit={handleSubmit} loading={loading} />
    </div>
  );
};

export default page;
