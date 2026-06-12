import type { Role, Level, MeetingPlatform } from "@/lib/constants";

export type SessionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";
export type CommitmentStatus =
  | "committed"
  | "attended"
  | "no_show"
  | "uncommitted";
export type AttendanceMark = "present" | "late" | "missed";
export type NotificationType =
  | "session_reminder"
  | "attendance_marked"
  | "at_risk_alert";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: Role;
  requested_role: "teacher" | "student" | null;
  status: "active" | "pending";
  referred_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  created_by: string;
  name: string;
  level: Level;
  teacher_id: string;
  start_date: string;
  duration_minutes: number;
  meeting_platform: MeetingPlatform | null;
  meeting_link: string | null;
  description: string | null;
  created_at: string;
}

export interface ClassSession {
  id: string;
  class_id: string;
  session_number: number;
  scheduled_at: string;
  status: SessionStatus;
  actual_minutes: number | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface Commitment {
  id: string;
  student_id: string;
  session_id: string;
  status: CommitmentStatus;
  created_at: string;
}

export interface Attendance {
  id: string;
  session_id: string;
  student_id: string;
  mark: AttendanceMark;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  created_at: string;
}

/** v_student_attendance */
export interface StudentAttendanceRow {
  student_id: string;
  full_name: string;
  attended: number;
  missed: number;
  total: number;
  attendance_rate: number | null;
}

/** v_teacher_hours_monthly */
export interface TeacherHoursRow {
  class_id: string;
  teacher_id: string;
  teacher_name: string;
  month: string;
  sessions: number;
  minutes: number;
  hours: number;
}

/** v_daily_attendance */
export interface DailyAttendanceRow {
  day: string;
  attended: number;
  total: number;
  rate: number | null;
}

/** owner_dashboard_stats() RPC */
export interface OwnerDashboardStats {
  active_classes: number;
  total_hours: number;
  attendance_rate: number;
  at_risk_count: number;
}

export interface Material {
  id: string;
  class_id: string;
  uploaded_by: string;
  title: string;
  kind: "file" | "link";
  storage_path: string | null;
  url: string | null;
  created_at: string;
}

/** v_teacher_students */
export interface TeacherStudentRow {
  teacher_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  joined_at: string;
  attended: number;
  total: number;
  attendance_rate: number | null;
}

/** v_session_attendance */
export interface SessionAttendanceRow {
  session_id: string;
  class_id: string;
  class_name: string;
  level: Level;
  teacher_id: string;
  teacher_name: string | null;
  session_number: number;
  scheduled_at: string;
  status: SessionStatus;
  actual_minutes: number | null;
  committed: number;
  present: number;
  late: number;
  missed: number;
}

/** message_threads (one per member, owned by the academy) */
export interface MessageThread {
  id: string;
  member_id: string;
  last_message_at: string;
  member_unread: number;
  owner_unread: number;
  member_last_read_at: string | null;
  created_at: string;
}

/** messages — ciphertext at rest; decrypted server-side before display */
export interface MessageRow {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: "owner" | "member";
  ciphertext: string;
  created_at: string;
  requires_ack: boolean;
  broadcast_id: string | null;
}

/** A message with its body already decrypted, safe to send to the client. */
export interface DecryptedMessage {
  id: string;
  sender_role: "owner" | "member";
  body: string;
  created_at: string;
  requires_ack?: boolean;
  acked?: boolean;
}

/** A row from rpc_teacher_digests. */
export interface TeacherDigestRow {
  teacher_id: string;
  teacher_name: string;
  sessions: number;
  hours: number;
  attendance_rate: number | null;
  students: number;
  at_risk: number;
}

/** A broadcast/announcement with seen + ack rollups for the owner console. */
export interface BroadcastRow {
  id: string;
  audience: "all" | "teachers" | "students";
  requires_ack: boolean;
  send_at: string | null;
  recurrence: "none" | "weekly" | "monthly";
  status: "pending" | "sent" | "cancelled";
  sent_count: number | null;
  created_at: string;
  sent_at: string | null;
  preview: string;
  total: number;
  seen: number;
  acked: number;
}

/** A row in the owner audit log, joined with the actor's name. */
export interface AuditRow {
  id: string;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

/** An owner-side thread row joined with the member's identity. */
export interface OwnerThreadRow {
  id: string;
  member_id: string;
  member_name: string;
  member_role: "teacher" | "student";
  last_message_at: string;
  owner_unread: number;
  preview: string;
}
