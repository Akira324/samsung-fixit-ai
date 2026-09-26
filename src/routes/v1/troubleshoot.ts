import { createFileRoute } from "@tanstack/react-router";
import { theme2PipelineService } from "@/lib/server/services/theme2/pipeline.service";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const Route = createFileRoute("/v1/troubleshoot")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: any;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Please send a valid JSON request." }, 400);
        }

        try {
          const result = await theme2PipelineService.processTroubleshoot(payload);
          return json(result);
        } catch (error) {
          console.error("[v1/troubleshoot] unexpected failure", error);
          return json(
            { error: "Something went wrong processing the troubleshooting request." },
            500
          );
        }
      },
    },
  },
});
