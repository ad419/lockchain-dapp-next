"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

// Dynamically import SwapFrame with no SSR
const SwapFrame = dynamic(() => import("../../components/SwapFrame"), {
  ssr: false,
});

function SwapPage() {
  const searchParams = useSearchParams();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SwapFrame searchParams={searchParams} />
    </Suspense>
  );
}

export default SwapPage;
