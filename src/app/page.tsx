import Link from "next/link";
import Image from "next/image";
export default function Page() {
  // useRouter hook to handle navigation

  return (
    <div>
      <Image src="/logo.png" alt="logo" width="37" height="37" />
      <h1>
        HomePage is not just a homepage. its your gateway to something
        beautiful.
      </h1>
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
    </div>
  );
}
