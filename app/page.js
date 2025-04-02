import LeaderboardServer from "./components/LeaderboardServer";

export const revalidate = 15; // Revalidate page every 15 seconds

export default function Home() {
  return <LeaderboardServer />;
}
