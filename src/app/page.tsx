import Link from "next/link";
import Image from "next/image";
export default function Page() {
  // useRouter hook to handle navigation

  return (
    <div>
      <div className="flex items-center">
        <Image src="/logo.png" alt="logo" width="37" height="37" />
        <h1>aula</h1>
      </div>
      <Link
        href="/signup"
        className="font-medium text-blue-600 hover:text-blue-800"
      >
        Sign up
      </Link>
      <Link
        href="/signin"
        className="font-medium text-blue-600 hover:text-blue-800"
      >
        Sign in
      </Link>
      <Link
        href="/signout"
        className="font-medium text-blue-600 hover:text-blue-800"
      >
        Sign out
      </Link>

    </div>
  );
}
