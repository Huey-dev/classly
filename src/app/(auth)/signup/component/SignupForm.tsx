// SignupForm.tsx
import React, { useState } from "react";
import { SignupFormData, SignupFormProps } from "../../.../../../../../type";

const SignupForm = ({ onSubmit, loading, error }: SignupFormProps) => {
  const [formData, setFormData] = useState<SignupFormData>({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);  
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="Email"
        type="email"
        disabled={loading}
        className="border p-2 w-full"
      />
    
      <input
        name="password"
        value={formData.password}
        onChange={handleChange}
        placeholder="Password"
        type="password"
        disabled={loading}
        className="border p-2 w-full"
      ></input>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Signing up..." : "Sign Up"}
      </button>
    </form>
  );
}
export default SignupForm 
