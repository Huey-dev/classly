"use client";

import { unifiedSignOut } from "../lib/auth/signout";

export default function Signout() {
  return (
    <button
      className="rounded shadow-md p-4 bg-white"
      onClick={() => unifiedSignOut("/signin")}
    >
      Sign out
    </button>
  );
}
