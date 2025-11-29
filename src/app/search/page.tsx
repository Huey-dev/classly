import { Suspense } from "react";
import SearchClient from "../component/SearchClient";

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchClient />
    </Suspense>
  );
}
