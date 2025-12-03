"use client";

import Link from "next/link";
import Image from "next/image";
import SearchBar from "./SearchBar";

export const Header = ({
  openSidebar,
  theme,
}: {
  openSidebar: () => void;
  theme: string;
}) => (
  <header className="flex justify-between p-4 bg-white dark:bg-gray-900 shadow">
    <Link href="/" className="flex items-center gap-2 select-none">
      <Image
        src="/app-logo.png"
        alt="Classly logo"
        width={70}
        height={70}
        className="h-10 w-auto md:h-12"
      />
      <span className=" text-md font-bold text-black dark:text-white leading-none">lassly
      </span>
    </Link>
     <div className="hidden md:block"> <SearchBar />
     </div>

    <div className="flex items-center space-x-4">
      {/* notification, upload button */}
      <Link
        href="/upload"
        className="px-12 py-2 bg-green-600 text-white rounded-full hover:bg-blue-700 transition-colors hidden md:block"
      ><span className="text-lg">+</span> <span>Upload</span></Link>
      
    </div>
  </header>
);
