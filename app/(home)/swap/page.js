"use client";

import React, { Suspense } from "react";
import SwapFrame from "../../components/SwapFrame";
import { useSearchParams } from "next/navigation";

function SwapPage() {
  const searchParams = useSearchParams();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SwapFrame searchParams={searchParams} />
    </Suspense>
  );
}

export default SwapPage;
