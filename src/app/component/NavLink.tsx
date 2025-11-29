import Link from "next/link";
import { ReactNode } from "react";

export const NavLink = ({
  href,
  children,
  onClick,
}: {
  href: string;
  children: ReactNode;
  onClick?: () => void;
}) => (
  <Link
    href={href}
    className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
    onClick={onClick}
  >
    {children}
  </Link>
);
