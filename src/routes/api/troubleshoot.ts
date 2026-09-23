import { createFileRoute } from "@tanstack/react-router";
import { troubleshoot, UserFacingError } from "@/lib/server/services/troubleshooting.service";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const Route = createFileRoute("/api/troubleshoot")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: { complaint?: unknown };
        try {
          payload = (await request.json()) as { complaint?: unknown };
        } catch {
          return json({ error: "Please send a valid request." }, 400);
        }

        try {
          return json(await troubleshoot(payload?.complaint));
        } catch (error) {
          if (error instanceof UserFacingError) {
            return json({ error: error.message }, error.status);
          }
          console.error("[troubleshoot] unexpected failure", error);
          return json(
            { error: "Something went wrong on our side. Please try again in a moment." },
            500,
          );
        }
      },
    },
  },
});
