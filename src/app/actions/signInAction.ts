"use server";

import { signIn } from "../../../auth";

export async function signInAction(formData: FormData) {
  const email = formData.get("email") as string;
  await signIn("email", { email });
}