"use client"

import { signOut } from "next-auth/react"
 
export default function Signout() {
  return (
    <button
      className="rounded shadow-md p-4 bg-white"
      onClick={async () => {
        try {
          await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
        } finally {
          await signOut({ redirect: false });
          window.location.href = "https://accounts.google.com/Logout";
        }
      }}
    >
      Sign out with google
    </button>
  );
}
