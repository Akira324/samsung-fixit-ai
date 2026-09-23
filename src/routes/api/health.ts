import { createFileRoute } from "@tanstack/react-router";
import { cacheStats } from "@/lib/server/services/cache.service";
import { isFreeModel, isLlmConfigured } from "@/lib/server/services/llm.service";
import { knowledgeBaseSize, listCategories } from "@/lib/server/services/retrieval.service";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          status: "ok",
          llmConfigured: isLlmConfigured(),
          freeModel: isFreeModel(),
          model: process.env["LLM_MODEL"] || null,
          knowledgeBase: { flows: knowledgeBaseSize(), categories: listCategories() },
          cache: cacheStats(),
        }),
    },
  },
});
