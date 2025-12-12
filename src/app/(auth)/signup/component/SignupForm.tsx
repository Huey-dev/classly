import React, { useState } from "react";
import { SignupFormData, SignupFormProps } from "../../.../../../../../type";

const SignupForm = ({ onSubmit, loading, error }: SignupFormProps) => {
  const [formData, setFormData] = useState<SignupFormData>({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

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
      <div className="space-y-1">
        <label htmlFor="email" className="font-medium text-sm text-gray-700">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-3 bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none transition"
          disabled={loading}
          placeholder="Your email address"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="font-medium text-sm text-gray-700">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-3 bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none transition pr-10"
            disabled={loading}
            placeholder="Create password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute inset-y-0 right-3 flex items-center text-gray-500"
            aria-label="Toggle password visibility"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              {showPassword ? (
                <path d="M2 2l20 20M10.58 10.58a2 2 0 102.84 2.84M16.88 16.88A9.98 9.98 0 0112 18c-5 0-9-4-9-6a9.77 9.77 0 012.38-3.56m3.17-2.65A9.87 9.87 0 0112 6c5 0 9 4 9 6 0 1.09-.55 2.22-1.47 3.26" />
              ) : (
                <>
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#2d68f8] text-white py-3 rounded-lg disabled:opacity-50 font-semibold shadow-md hover:shadow-lg transition"
      >
        {loading ? "Creating account..." : "Create Account"}
      </button>
    </form>
  );
};
export default SignupForm;
