export const COMMIT_CUTOFF_HOURS = 1;
export const UNCOMMIT_CUTOFF_HOURS = 2;
export const SESSIONS_PER_CLASS = 4;
export const AT_RISK_MISSED_THRESHOLD = 3;
export const TIMEZONE = "Asia/Seoul";

export const ROLES = ["owner", "teacher", "student"] as const;
export type Role = (typeof ROLES)[number];

export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type Level = (typeof LEVELS)[number];

export const MEETING_PLATFORMS = ["zoom", "google_meet", "in_person"] as const;
export type MeetingPlatform = (typeof MEETING_PLATFORMS)[number];
