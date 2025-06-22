"use client";
import { useState } from "react";
import { OnboardingFormData } from "../../../../type";

interface Props {
  onSubmit: (data: OnboardingFormData) => void;
  loading: boolean;
}

const Form = ({ onSubmit, loading }: Props) => {
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Image Upload */}
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        disabled={loading}
      />

      {/* Channel Name */}
      <input
        name="name"
        type="text"
        value={formData.name}
        onChange={handleChange}
        required
        placeholder="Channel name"
        className="mt-1 block w-full border px-2 py-1 rounded"
        disabled={loading}
      />

      {/* Description */}
      <textarea
        name="description"
        value={formData.description}
        onChange={handleChange}
        required
        placeholder="Describe your channel"
        className="mt-1 block w-full border px-2 py-1 rounded"
        disabled={loading}
      />

      <button
        type="submit"
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded"
      >
        {loading ? "Creating..." : "Create Classroom"}
      </button>
    </form>
  );
};

export default Form;
