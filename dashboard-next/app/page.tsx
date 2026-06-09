import { Dashboard } from "@/components/dashboard";
import { defaultRange } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default function Home() {
  const { from, to } = defaultRange();
  return <Dashboard defaultFrom={from} defaultTo={to} />;
}
