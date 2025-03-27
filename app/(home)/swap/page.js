import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

// Dynamically import SwapFrame with no SSR and loading state
const SwapFrame = dynamic(() => import("../../components/SwapFrame"), {
  ssr: false,
  loading: () => (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "100vh" }}
    >
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  ),
});

function SwapPage() {
  const searchParams = useSearchParams();

  return (
    <div suppressHydrationWarning>
      <Suspense
        fallback={
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: "100vh" }}
          >
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        }
      >
        <SwapFrame searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

export default SwapPage;
