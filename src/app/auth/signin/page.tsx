import SigninBtn from "../../component/SigninBtn";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 p-4">
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-4">
          Welcome!
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Enter your email to sign in and unlock your digital classroom.
        </p>
        <SigninBtn />
      </div>
    </div>
  );
}
