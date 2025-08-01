"use client";

import { useState } from "react";
import { OnboardingFormData } from "../../../../type";

interface Props {
  onSubmit: (data: OnboardingFormData) => void;
  loading: boolean;
  error?: string | null
}

const Form = ({ onSubmit, loading, error }: Props) => {
  const [formData, setFormData] = useState<OnboardingFormData>({
    image: null,
    name: "",
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, image: file }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    
    <div className="flex items-center justify-center px-4 ">
      {error && <div className="error-message">{error}</div>}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 w-full max-w-md p-6 bg-white rounded-lg shadow-md"
      >
        {/* Image Upload */}
        <div className="flex flex-col items-center">
          <label className="cursor-pointer font-light text-sm">
            <div className="w-24 h-24 mt-4 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {formData.image ? (
                  <img
                  src={URL.createObjectURL(formData.image)}
                  alt="Preview"
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-sm text-gray-500">Upload</span>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={loading}
              />
              upload image
          </label>
        </div>

        {/* Channel Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Channel Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Enter your channel name"
            className="block w-full border px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            disabled={loading}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Channel Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            placeholder="Describe your channel..."
            className="block w-full border px-3 py-2 rounded-md shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
            rows={4}
            disabled={loading}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#ED1C24] text-white py-2 px-4 rounded-md hover:bg-red-600 transition"
        >
          {loading ? "Creating..." : "Create Classroom"}
        </button>
      </form>
    </div>
  );
};

export default Form;
