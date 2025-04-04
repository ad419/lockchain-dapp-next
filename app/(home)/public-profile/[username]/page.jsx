import React from "react";
import PublicProfile from "@/app/components/PublicProfile";

export default function ProfilePage({ params }) {
  const { username } = params;
  
  return <PublicProfile username={username} />;
}