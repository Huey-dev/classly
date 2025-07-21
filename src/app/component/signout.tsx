"use client"

import { signOut } from "next-auth/react"
 
export default function Signout() {
  return (
    <button
      className="rounded shadow-md p-4 bg-white"
      onClick={() => signOut({ callbackUrl: "/signin" })}
    >
      Sign out with google
    </button>
  );
}