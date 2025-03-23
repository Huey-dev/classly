
import { useState } from "react";
import { signIn } from "../../../auth";

export default function SigninBtn() {
    const [email, setEmail] = useState("");
  return (
    <form
      className="w-full flex justify-center items-center"
      action={async () => {
        "use server";
        await signIn(email);
      }}
    >
       <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />
      <button
        type="submit"
        className="w-full md:w-auto rounded-lg bg-blue-600 p-4 text-white font-semibold text-center hover:bg-blue-700 transition-colors"
      >
        Sign In or Create Account
      </button>
    </form>
  );
}
