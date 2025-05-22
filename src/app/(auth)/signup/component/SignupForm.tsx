"use client";
import Link from "next/link";

import {
  ChangeEventHandler,
  FormEventHandler,
  useEffect,
  useState,
} from "react";

type formDataType = {
  email: string;
  password: string;
};
const SignupForm = ({}) => {
  // keep track of users input
  const [formData, setFormData] = useState<formDataType>({
    email: "",
    password: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const inputElem = e.target;
  };
  const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setLoading(true);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" onChange={handleChange} value={formData.email} />
      <input
        name="password"
        onChange={handleChange}
        value={formData.password}
      />
      <button type="submit">{loading ? "Loading..." : "Sign Up"}</button>
    </form>
  );
};
export default SignupForm;