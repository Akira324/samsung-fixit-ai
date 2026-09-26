import { z } from "zod";
import type { ContextDeeplinkResponse } from "./types";

export const ConditionSchema = z.enum(["greater", "equal", "less"]);

export const ResultTypesSchema = z.enum(["boolean", "integer", "str", "float"]);

export const ActionCategorySchema = z.enum(["auto", "manual", "critical"]);

export const BaseDeeplinkSchema = z.object({
  deeplink: z.string().min(1),
});

export const DeeplinkSchema = BaseDeeplinkSchema.extend({
  description: z.string(),
  message: z.string().optional().default(""),
  classes: z.record(z.string()).nullable().optional(),
  originalType: z.string().nullable().optional(),
});

export const ValidationDeepLinkSchema = BaseDeeplinkSchema.extend({
  key: z.string(),
  resultType: ResultTypesSchema.nullable().optional(),
  condition: ConditionSchema.nullable().optional(),
  value: z.string().nullable().optional(),
});

export const StepGroupSchema = z.object({
  steps: z.array(z.string()),
  validationDeeplink: ValidationDeepLinkSchema.nullable().optional(),
  actionableDeeplink: DeeplinkSchema.nullable().optional(),
});

export const ActionSchema = z.object({
  actionName: z.string(),
  description: z.string(),
  stepGroups: z.array(StepGroupSchema),
  category: ActionCategorySchema.optional().default("manual"),
});

export const GoalSchema = z.object({
  goal: z.string(),
  title: z.string(),
  actions: z.array(ActionSchema),
  score: z.number(),
});

export const ContextDeeplinkResponseSchema = z.object({
  contexts: z.array(GoalSchema).default([]),
});

/**
 * Validate that an object strictly adheres to schema.py definition.
 * Throws ZodError if invalid.
 */
export function validateResponseAgainstSchema(data: unknown): ContextDeeplinkResponse {
  return ContextDeeplinkResponseSchema.parse(data);
}
