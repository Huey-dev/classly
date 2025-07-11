"use client"

import { signIn } from "next-auth/react"
 
export default function SignIn() {
  return <button className="rounded shadow-md p-4 bg-white"  onClick={() => signIn("google", { callbackUrl: "" })}>Sign in with google</button>
}