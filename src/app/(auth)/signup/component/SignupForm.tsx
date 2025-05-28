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
     <label>Email</label>
        <input
          type="email"
          name="email" 
          value={formData.email}
          onChange={handleChange}
          className="border p-2 w-full"
        />
    
       <label>Password</label>
        <input
          type="password"
          name="password" 
          value={formData.password}
          onChange={handleChange}
          className="border p-2 w-full"
        />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Signing up..." : "Sign Up"}
      </button>
    </form>
  );
}
export default SignupForm 
