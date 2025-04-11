import React from "react";
import { notFound } from "next/navigation";
import PublicProfileClient from "@/app/components/PublicProfile";
import ProfileSkeleton from "@/app/components/ProfileSkeleton";
import { Suspense } from "react";

// Fetch user profile data with error handling
async function getProfileData(username) {
  try {
    const res = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || ""
      }/user-profile?username=${encodeURIComponent(username)}`,
      { next: { revalidate: 60 * 10 } } // Cache for 10 minutes
    );

    if (!res.ok) return null;

    const data = await res.json();
    return data.success ? data.user : null;
  } catch (error) {
    console.error("Error fetching profile data:", error);
    return null;
  }
}

// Fetch holder data with error handling
async function getHolderData(walletAddress) {
  try {
    if (!walletAddress) return null;

    const res = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || ""
      }/holder-data?address=${walletAddress}`,
      { next: { revalidate: 60 } } // Cache for 1 minute
    );

    if (!res.ok) {
      if (res.status === 404) {
        console.log("No holder data found for this wallet");
        return null;
      }
      throw new Error(`Failed to fetch holders data (${res.status})`);
    }

    const data = await res.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error("Error fetching holder data:", error);
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  const username = params.username;
  const profileData = await getProfileData(username);

  if (!profileData) {
    return {
      title: "Profile Not Found | LockChain",
      description: "This profile could not be found on LockChain.",
    };
  }

  return {
    title: `${profileData.name || profileData.username} | LockChain`,
    description:
      profileData.bio ||
      `View ${profileData.name || profileData.username}'s profile on LockChain`,
    openGraph: {
      images: profileData.profileImage ? [profileData.profileImage] : undefined,
    },
  };
}

// This is a Server Component that pre-fetches data
export default async function ProfilePage({ params }) {
  const username = params.username;

  // Fetch profile data server-side
  const profileData = await getProfileData(username);

  // If no profile data, show 404
  if (!profileData) {
    notFound();
  }

  // If the profile has a wallet, fetch holder data
  let holderData = null;
  let tokenPrice = 0;

  if (profileData.walletAddress) {
    const holderResult = await getHolderData(profileData.walletAddress);
    if (holderResult) {
      holderData = holderResult;
      tokenPrice = holderResult.tokenPrice || 0;
    }
  }

  // Pass pre-fetched data to the client component
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <PublicProfileClient
        initialProfileData={profileData}
        initialHolderData={holderData}
        initialTokenPrice={tokenPrice}
        username={username}
      />
    </Suspense>
  );
}
