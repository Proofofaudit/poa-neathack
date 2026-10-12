import IncidentRoom from "@/components/incident-room";
export const dynamic = "force-dynamic";
export default function Page() {
  const canRunSandbox =
    process.env.NODE_ENV !== "production" ||
    (process.env.ALLOW_PROD_SIMULATION === "true" &&
      (process.env.POA_DEMO_TOKEN?.length || 0) >= 32);
  return <IncidentRoom canRunSandbox={canRunSandbox} />;
}
