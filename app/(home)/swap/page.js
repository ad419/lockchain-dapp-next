"use client";

import React, { Suspense } from "react";
import SwapFrame from "../../components/SwapFrame";

function SwapPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SwapFrame />
    </Suspense>
  );
}

export default SwapPage;
