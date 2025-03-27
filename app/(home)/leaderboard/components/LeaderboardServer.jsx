import { Suspense } from 'react';
import { unstable_cache } from 'next/cache';
import Leaderboard from '../../../components/Leaderboard';
import LoadingSpinner from './LoadingSpinner';

const getInitialData = unstable_cache(
  async () => {
    try {
      const [holdersResponse, priceResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/holders`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/price`)
      ]);
      
      const [holders, price] = await Promise.all([
        holdersResponse.json(),
        priceResponse.json()
      ]);

      return { holders, price };
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      return { holders: [], price: null };
    }
  },
  ['holders-data'],
  { revalidate: 300 }
);

export default async function LeaderboardWrapper() {
  const initialData = await getInitialData();

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Leaderboard initialData={initialData} />
    </Suspense>
  );
}