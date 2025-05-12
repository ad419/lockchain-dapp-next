"use client";

import React from "react";
import SwapFrame from "@/app/components/SwapFrame";
import { useSearchParams } from "next/navigation";

const Page = () => {
  const searchParams = useSearchParams();

  // Add a check to make sure searchParams is available
  if (!searchParams) {
    return null; // or a loading state
  }

  return <SwapFrame searchParams={searchParams} />;
};

// Also note: component names should start with uppercase letters
export default Page;
