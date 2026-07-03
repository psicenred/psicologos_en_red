export type CourseGradingMode = 'weighted' | 'pass_fail';
export type CoursePassStatus = 'pending' | 'passed' | 'failed';
export type CourseFormat = 'sync' | 'async';
export type CourseStatus = 'draft' | 'published' | 'archived';
export type InstructorStatus = 'pending' | 'approved' | 'rejected';
export type LessonContentType = 'video' | 'pdf' | 'text' | 'live_link';
export type EnrollmentStatus =
  | 'active'
  | 'payment_overdue'
  | 'paused'
  | 'completed'
  | 'cancelled';
export type PaymentPlan = 'full' | 'monthly';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'refunded';
export type AcademiaRole = 'student' | 'instructor' | 'admin';

export interface CourseStudentProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  timezone: string | null;
  created_at: string;
}

export interface CourseInstructorProfile {
  id: string;
  full_name: string | null;
  bio: string | null;
  status: InstructorStatus;
  revenue_share_pct: number;
  created_at: string;
}

export interface Course {
  id: string;
  instructor_id: string;
  title: string;
  slug: string;
  description: string | null;
  curriculum: string | null;
  format: CourseFormat;
  status: CourseStatus;
  price_full: number | null;
  price_monthly: number | null;
  duration_months: number;
  max_students: number;
  category: string | null;
  level: string | null;
  thumbnail_url: string | null;
  grading_mode?: CourseGradingMode;
  attendance_weight_pct?: number;
  created_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
}

export interface CourseLesson {
  id: string;
  module_id: string;
  title: string;
  content_type: LessonContentType;
  video_url: string | null;
  pdf_url: string | null;
  text_content: string | null;
  order_index: number;
  unlock_at: string | null;
}

export interface ModuleWithLessons extends CourseModule {
  lessons: CourseLesson[];
}

export interface CourseEnrollment {
  id: string;
  student_id: string;
  course_id: string;
  cohort_id: string | null;
  payment_plan: PaymentPlan;
  status: EnrollmentStatus;
  enrolled_at: string;
}

export interface CoursePayment {
  id: string;
  enrollment_id: string;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  status: PaymentStatus;
  stripe_payment_id: string | null;
}

export interface CourseWithInstructor extends Course {
  instructor?: Pick<CourseInstructorProfile, 'full_name' | 'bio' | 'status'>;
}

export type CohortStatus = 'upcoming' | 'active' | 'completed';
export type LiveSessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

export interface CourseCohort {
  id: string;
  course_id: string;
  start_date: string;
  end_date: string;
  live_session_weekday: number;
  live_session_time: string;
  timezone: string;
  status: CohortStatus;
  created_at: string;
}

export interface CourseLiveSession {
  id: string;
  cohort_id: string;
  daily_room_url: string | null;
  daily_room_name: string | null;
  scheduled_at: string;
  recording_url: string | null;
  status: LiveSessionStatus;
}

export interface CourseAttendance {
  student_id: string;
  live_session_id: string;
  attended: boolean;
  joined_at: string | null;
}

export interface AttendanceSheetRow {
  student_id: string;
  full_name: string;
  attended: boolean;
  joined_at: string | null;
}

export interface AttendanceSessionSummary {
  session_id: string;
  scheduled_at: string;
  status: LiveSessionStatus;
  present_count: number;
  total_students: number;
  attendance_pct: number;
}

export interface CourseAttendanceReport {
  course_id: string;
  cohorts: {
    cohort_id: string;
    label: string;
    start_date: string;
    end_date: string;
    students: { student_id: string; full_name: string }[];
    sessions: AttendanceSessionSummary[];
    matrix: Record<string, Record<string, boolean>>;
    student_totals: Record<string, { attended: number; total: number; pct: number }>;
  }[];
}

export interface CohortWithSessions extends CourseCohort {
  sessions?: CourseLiveSession[];
  enrollment_count?: number;
}

export type ExamQuestionType = 'multiple_choice' | 'essay';
export type ExamSubmissionStatus = 'submitted' | 'graded' | 'released';
export type AssignmentSubmissionStatus = 'submitted' | 'graded';

export interface ExamOption {
  id: string;
  text: string;
  is_correct?: boolean;
}

export interface CourseExam {
  id: string;
  course_id: string;
  theme_id: string | null;
  subtopic_id: string | null;
  title: string;
  weight_pct: number;
  rubric: string | null;
  due_date: string | null;
  created_at: string;
}

export interface CourseExamQuestion {
  id: string;
  exam_id: string;
  question_type: ExamQuestionType;
  question_text: string;
  options: ExamOption[] | null;
  points: number;
  order_index: number;
}

export interface CourseExamSubmission {
  id: string;
  exam_id: string;
  student_id: string;
  submitted_at: string;
  status: ExamSubmissionStatus;
  auto_score: number | null;
  final_score: number | null;
  graded_at: string | null;
}

export interface CourseExamAnswer {
  submission_id: string;
  question_id: string;
  answer_text: string | null;
  is_correct: boolean | null;
  points_awarded: number | null;
  instructor_feedback: string | null;
}

export interface CourseAssignment {
  id: string;
  course_id: string;
  theme_id: string | null;
  subtopic_id: string | null;
  title: string;
  instructions: string | null;
  attachment_urls: string[];
  due_date: string;
  weight_pct: number;
  rubric: string | null;
  late_penalty_pct_per_day: number;
  created_at: string;
}

export interface CourseAssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_urls: string[];
  submitted_at: string;
  is_late: boolean;
  raw_score: number | null;
  final_score: number | null;
  instructor_feedback: string | null;
  status: AssignmentSubmissionStatus;
}

export interface CourseFinalGrade {
  student_id: string;
  course_id: string;
  computed_grade: number | null;
  pass_status?: CoursePassStatus;
  updated_at: string;
}

export interface ExamWithQuestions extends CourseExam {
  questions: CourseExamQuestion[];
}

export interface InstructorCourseMetrics {
  pendingGrading: number;
  averageGrade: number | null;
  attendanceRate: number | null;
  dropoutRiskCount: number;
  averageProgressPct: number | null;
  enrolledStudents: number;
}

export interface CourseCertificate {
  id: string;
  student_id: string;
  course_id: string;
  certificate_code: string;
  final_grade: number;
  issued_at: string;
}

export interface CertificateEligibility {
  eligible: boolean;
  reason?: string;
  grade: number | null;
  progressPct: number;
  certificate: CourseCertificate | null;
}

export interface InstructorRevenueLine {
  course_id: string;
  course_title: string;
  gross_mxn: number;
  instructor_share_mxn: number;
  revenue_share_pct: number;
  paid_payments_count: number;
}

export interface InstructorRevenueReport {
  total_gross_mxn: number;
  total_instructor_share_mxn: number;
  revenue_share_pct: number;
  lines: InstructorRevenueLine[];
}

export interface CourseAnnouncement {
  id: string;
  course_id: string;
  instructor_id: string;
  title: string;
  body: string;
  created_at: string;
  visible_from: string | null;
  visible_until: string | null;
}

export interface StudentAnnouncementFeedItem extends CourseAnnouncement {
  course_title: string;
  instructor_name: string | null;
}

export interface CourseForumThread {
  id: string;
  course_id: string;
  student_id: string;
  title: string;
  body: string;
  created_at: string;
}

export interface CourseForumReply {
  id: string;
  thread_id: string;
  student_id: string;
  body: string;
  created_at: string;
}

export interface CourseForumThreadListItem extends CourseForumThread {
  student_name: string;
  reply_count: number;
}

export interface CourseForumThreadDetail extends CourseForumThread {
  student_name: string;
  replies: (CourseForumReply & { student_name: string })[];
}

export interface CurriculumSubtopic {
  id: string;
  title: string;
  content: string[];
  /** Solo panel alumno/instructor */
  start_date?: string;
  end_date?: string;
}

export interface CurriculumTheme {
  id: string;
  title: string;
  /** Solo visible en panel alumno/instructor — no en /academia público */
  start_date?: string;
  end_date?: string;
  subtopics: CurriculumSubtopic[];
  bibliography: string;
}

export interface StructuredCurriculum {
  v: 1;
  themes: CurriculumTheme[];
}
