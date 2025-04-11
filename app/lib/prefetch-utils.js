// Utility for prefetching commonly accessed profiles

/**
 * Prefetches popular profiles for faster user experience
 * Call this function from app/page.js or high traffic pages
 */
export async function prefetchPopularProfiles() {
  try {
    // Fetch top 10 profiles that are most likely to be viewed
    console.log("🔄 Prefetching popular profiles");

    // This call will populate the server-side cache
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || ""}/api/holders?prefetch=true`,
      {
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      console.warn("Failed to prefetch popular profiles:", response.status);
      return;
    }

    const data = await response.json();

    // Extract top holders with social info
    const popularProfiles = data.holders
      .filter((holder) => holder.social)
      .slice(0, 10)
      .map((holder) => holder.social.twitterUsername);

    console.log(`Found ${popularProfiles.length} popular profiles to prefetch`);

    // Prefetch each profile
    const prefetchPromises = popularProfiles.map((username) =>
      fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || ""
        }/api/user-profile?username=${encodeURIComponent(username)}`
      )
        .then((res) => {
          if (res.ok) console.log(`✅ Prefetched ${username}`);
          else console.log(`❌ Failed to prefetch ${username}`);
        })
        .catch((err) => console.warn(`Failed to prefetch ${username}:`, err))
    );

    // Wait for all prefetches to complete, but don't block
    Promise.allSettled(prefetchPromises);

    return popularProfiles;
  } catch (error) {
    console.warn("Error prefetching popular profiles:", error);
    return [];
  }
}
