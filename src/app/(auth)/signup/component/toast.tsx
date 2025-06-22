export default function Toast({ message }: { message: string }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-[#ED1C24] text-white font-semibold px-6 py-3 rounded-lg shadow-lg z-50">
      {message}
    </div>
  );
}
