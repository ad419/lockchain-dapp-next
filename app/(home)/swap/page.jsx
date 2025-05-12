"use client";

import React, { Suspense } from "react";
import SwapFrame from "@/app/components/SwapFrame";
import { useSearchParams } from "next/navigation";

// Create a client component that uses the search params
function SwapContent() {
  const searchParams = useSearchParams();

  // Add a check to make sure searchParams is available
  if (!searchParams) {
    return null; // or a loading state
  }

  return <SwapFrame searchParams={searchParams} />;
}

// Main page component with Suspense boundary
const Page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SwapContent />
    </Suspense>
  );
};

export default Page;
