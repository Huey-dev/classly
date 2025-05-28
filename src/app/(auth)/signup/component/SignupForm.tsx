// SignupForm.tsx
"use client";

export default function SignupForm() {
  return (
    <form>
      <label>Email</label>
      <input name="userEmail" type="email" />

      <label>Password</label>
      <input name="userPassword" type="password" />

      <button type="submit">Sign up</button>
    </form>
  );
}
