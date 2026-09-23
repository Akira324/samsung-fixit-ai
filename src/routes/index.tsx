import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/troubleshooter/Header";
import { ComplaintInput } from "@/components/troubleshooter/ComplaintInput";
import { ExampleProblems } from "@/components/troubleshooter/ExampleProblems";
import { LoadingState } from "@/components/troubleshooter/LoadingState";
import { ErrorMessage } from "@/components/troubleshooter/ErrorMessage";
import { ResultsPanel } from "@/components/troubleshooter/ResultsPanel";
import { requestTroubleshooting, type TroubleshootResponse } from "@/services/troubleshootApi";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Samsung AI Troubleshooter" },
      {
        name: "description",
        content:
          "Describe your Samsung device problem in plain words and get validated, ordered troubleshooting steps with Settings shortcuts.",
      },
      { property: "og:title", content: "Samsung AI Troubleshooter" },
      {
        property: "og:description",
        content:
          "AI-assisted device troubleshooting with a validated knowledge base, Settings deeplinks and a sub-second fast-path cache.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const [complaint, setComplaint] = useState("");
  const [result, setResult] = useState<TroubleshootResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (text?: string) => {
    const query = (text ?? complaint).trim();
    if (!query || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await requestTroubleshooting(query));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-[32rem] bg-[radial-gradient(ellipse_at_top,var(--surface-glow),transparent_65%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col">
        <Header />

        <main className="flex-1 px-5 pb-20 pt-8 sm:px-10 sm:pt-14">
          <div className="text-center">
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
              Samsung AI Troubleshooter
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
              Describe your device problem. Get clear troubleshooting steps instantly.
            </p>
          </div>

          <div className="mt-8 sm:mt-10">
            <ComplaintInput
              value={complaint}
              onChange={setComplaint}
              onSubmit={() => void submit()}
              loading={loading}
            />
          </div>

          <div className="mt-5">
            <ExampleProblems
              disabled={loading}
              onSelect={(example) => {
                setComplaint(example);
              }}
            />
          </div>

          <div className="mt-10 space-y-6">
            {loading && <LoadingState />}
            {!loading && error && <ErrorMessage message={error} onRetry={() => void submit()} />}
            {!loading && result && <ResultsPanel result={result} />}
          </div>
        </main>

        <footer className="px-5 pb-8 text-center text-[0.7rem] text-muted-foreground sm:px-10">
          Prototype · Samsung PRISM Generative AI Hackathon 2026–27 · Theme 2
        </footer>
      </div>
    </div>
  );
}
