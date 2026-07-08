// ============================================================
// Amrita Student Email Decoder
// Format: (campus).(course).U(prog)(dept)(yy)(roll)@(campus).students.amrita.edu
// Example: cb.en.u4cce24130@cb.students.amrita.edu
// ============================================================

// ── Campus map ───────────────────────────────────────────
const CAMPUS_MAP: Record<string, string> = {
  cb:         "Coimbatore",
  ch:         "Chennai",
  blr:        "Bengaluru",
  amritapuri: "Amritapuri",
  ay:         "Amritapuri",
  kochi:      "Kochi",
  mysuru:     "Mysuru",
};

// ── Course map ────────────────────────────────────────────
const COURSE_MAP: Record<string, string> = {
  en: "Engineering (B.Tech)",
  ca: "Computer Applications (MCA)",
  sc: "Science (B.Sc)",
  ba: "Business Administration (BBA/MBA)",
  ph: "Pharmacy",
  me: "Medicine (MBBS)",
  ar: "Architecture",
  la: "Law",
};

// ── Program map ───────────────────────────────────────────
const PROGRAM_MAP: Record<string, string> = {
  u4: "Undergraduate – 4 Years",
  u5: "Undergraduate – 5 Years (Integrated)",
  u6: "Undergraduate – 6 Years",
  p2: "Postgraduate – 2 Years",
  p3: "Postgraduate – 3 Years",
  r:  "Research / PhD",
};

// ── Department map ────────────────────────────────────────
const DEPT_MAP: Record<string, string> = {
  // Engineering
  cce:  "Computer & Communication Engineering",
  cse:  "Computer Science & Engineering",
  ece:  "Electronics & Communication Engineering",
  eee:  "Electrical & Electronics Engineering",
  mec:  "Mechanical Engineering",
  mece: "Mechanical Engineering",
  civ:  "Civil Engineering",
  it:   "Information Technology",
  ai:   "Artificial Intelligence",
  aids: "AI & Data Science",
  csb:  "CSE with Bioinformatics",
  csn:  "CSE with Networks",
  csd:  "CSE with Data Science",
  css:  "CSE with Cyber Security",
  iot:  "Internet of Things",
  rob:  "Robotics",
  aero: "Aeronautical Engineering",
  // Science
  phy:  "Physics",
  che:  "Chemistry",
  mat:  "Mathematics",
  bio:  "Biological Sciences",
  // Other
  mba:  "Business Administration",
  mca:  "Computer Applications",
};

export interface DecodedStudent {
  isValid: boolean;
  raw: string;
  campus: string | null;
  campusCode: string | null;
  course: string | null;
  program: string | null;
  department: string | null;
  departmentCode: string | null;
  yearOfJoining: number | null;
  rollNumber: string | null;        // e.g. "130"
  fullRollNumber: string | null;    // e.g. "CB.EN.U4CCE24130"
  batchLabel: string | null;        // e.g. "2024 – 2028"
}

/**
 * Decode an Amrita student email into structured student details.
 * Works on both the full email and just the local part.
 */
export function decodeAmritaEmail(email: string): DecodedStudent {
  const empty: DecodedStudent = {
    isValid: false,
    raw: email,
    campus: null, campusCode: null,
    course: null, program: null,
    department: null, departmentCode: null,
    yearOfJoining: null, rollNumber: null,
    fullRollNumber: null, batchLabel: null,
  };

  if (!email) return empty;

  // Extract local part (before @)
  const local = email.split("@")[0].toLowerCase().trim();

  // Split by dots: ["cb", "en", "u4cce24130"]
  const parts = local.split(".");
  if (parts.length < 3) return empty;

  const [campusCode, courseCode, rolePart] = parts;

  // ── Campus ──────────────────────────────────────────────
  const campus = CAMPUS_MAP[campusCode] ?? null;

  // ── Course ───────────────────────────────────────────────
  const course = COURSE_MAP[courseCode] ?? null;

  // ── Program + Dept + Year + Roll from rolePart ────────────
  // Format: u4cce24130  or  u4cse24056
  //         u4 + dept + 2-digit-year + roll
  // The program prefix is: u4 / u5 / u6 / p2 / p3 / r
  const programMatch = rolePart.match(/^([a-z]\d|[a-z])/);
  if (!programMatch) return { ...empty, campus, campusCode, course };

  const progCode = programMatch[0];
  const program = PROGRAM_MAP[progCode] ?? null;
  const afterProg = rolePart.slice(progCode.length); // e.g. "cce24130"

  // Year is always a 2-digit number; roll is after dept code
  // Dept codes are 2-4 alpha chars; year is 2 digits; roll is remaining digits
  const deptYearRollMatch = afterProg.match(/^([a-z]{2,5})(\d{2})(\d+)$/);
  if (!deptYearRollMatch) return { ...empty, campus, campusCode, course, program };

  const [, deptCode, yearStr, rollStr] = deptYearRollMatch;
  const department = DEPT_MAP[deptCode] ?? deptCode.toUpperCase();
  const yearShort = parseInt(yearStr, 10);
  const yearOfJoining = yearShort >= 0 && yearShort <= 50
    ? 2000 + yearShort
    : 1900 + yearShort;

  // Program duration to estimate graduation
  const duration = progCode === "u5" || progCode === "u6" ? 5 : progCode === "p2" ? 2 : 4;
  const batchLabel = `${yearOfJoining} – ${yearOfJoining + duration}`;

  // Build full roll number in standard format: CB.EN.U4CCE24130
  const fullRollNumber = [
    campusCode.toUpperCase(),
    courseCode.toUpperCase(),
    progCode.toUpperCase() + deptCode.toUpperCase() + yearStr + rollStr,
  ].join(".");

  return {
    isValid: true,
    raw: email,
    campus,
    campusCode: campusCode.toUpperCase(),
    course,
    program,
    department,
    departmentCode: deptCode.toUpperCase(),
    yearOfJoining,
    rollNumber: rollStr,
    fullRollNumber,
    batchLabel,
  };
}

// ── Auth helpers ─────────────────────────────────────────
const ALLOWED_DOMAINS = [
  "cb.students.amrita.edu",
  "ch.students.amrita.edu",
  "amritapuri.students.amrita.edu",
  "blr.students.amrita.edu",
  "ay.students.amrita.edu",
  "kochi.students.amrita.edu",
  "mysuru.students.amrita.edu",
  // Faculty / staff
  "amrita.edu",
  "cb.amrita.edu",
  "ch.amrita.edu",
  // Env override
  ...((process.env.ALLOWED_EMAIL_DOMAINS ?? "").split(",").filter(Boolean)),
];

export function isAllowedEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return false;
  return ALLOWED_DOMAINS.some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`)
  );
}

export function getDomainError(email: string): string | null {
  if (!email.includes("@")) return "Enter a valid email address.";
  if (!isAllowedEmail(email))
    return "Only Amrita college email addresses are allowed (e.g. cb.en.u4cce24130@cb.students.amrita.edu).";
  return null;
}
