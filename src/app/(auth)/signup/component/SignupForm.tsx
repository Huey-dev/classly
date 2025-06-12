import React, { useState } from "react";
import { SignupFormData, SignupFormProps } from "../../.../../../../../type";

const SignupForm = ({ onSubmit, loading, error }: SignupFormProps) => {
  const [formData, setFormData] = useState<SignupFormData>({
    email: "",
    password: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="font-light text-sm">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="mt-1 block w-full border px-2 py-1 rounded"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="password" className="font-light text-sm">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          required
          className="mt-1 block w-full border px-2 py-1 rounded"
          disabled={loading}
        />
      </div>

      {error && <p className="text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
      >
        {loading ? "Signing up…" : "Sign up"}
      </button>
    </form>
  );
};
export default SignupForm;
