"use client";

import React from "react";
import SwapFrame from "@/app/components/SwapFrame";
import { useSearchParams } from "next/navigation";

const page = () => {
  const searchParams = useSearchParams();
  return <SwapFrame searchParams={searchParams} />;
};

export default page;
