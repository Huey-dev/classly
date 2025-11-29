"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import IconSearch from "../component/icons/IconSearch";

export default function SearchBar() {
   const router = useRouter();
  const [value, setValue] = useState("");
  function handleSearch(e:any) {
    e.preventDefault();
    if (!value.trim()) return;
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }
  return (
    <form onSubmit={handleSearch} className="flex items-center w-full max-w-xl">
      {/* Input */}
      <div className="flex flex-1">
      
        <input
          type="text"
          placeholder="Search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="
            w-full px-4 py-2 
            bg-gray-100 dark:bg-gray-800 
            text-black dark:text-white
            border border-gray-300 dark:border-gray-700
            rounded-l-full
            focus:outline-none focus:border-blue-500
          "
        />
      </div>

      {/* Search button */}
      <button
      type="submit"
        className="
          px-6 py-[11px] 
          bg-gray-200 dark:bg-gray-700 
          border border-l-0 border-gray-300 dark:border-gray-700
          rounded-r-full
          flex items-center justify-center
          hover:bg-gray-300 dark:hover:bg-gray-600
          transition
        "
      >
        <IconSearch />
      </button>
     </form>
  );
}
