import { z } from "zod";
import { LEVELS, MEETING_PLATFORMS } from "@/lib/constants";

const httpUrl = z
  .string()
  .trim()
  .refine((v) => /^https?:\/\//i.test(v), {
    message: "Meeting link must start with http:// or https://",
  });

export const classSchema = z.object({
  name: z.string().trim().min(1, "Class name is required"),
  level: z.enum(LEVELS),
  teacher_id: z.string().uuid("Select a teacher"),
  start_date: z.string().min(1, "Start date is required"),
  duration_minutes: z.coerce
    .number()
    .int()
    .min(30, "Minimum 30 minutes")
    .max(240, "Maximum 240 minutes"),
  meeting_platform: z.enum(MEETING_PLATFORMS).optional().nullable(),
  meeting_link: httpUrl.optional().nullable().or(z.literal("").transform(() => null)),
  description: z.string().trim().optional().nullable(),
});

export type ClassFormValues = z.infer<typeof classSchema>;
