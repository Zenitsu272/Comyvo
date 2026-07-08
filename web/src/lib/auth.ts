// Email domain validation
const ALLOWED_DOMAINS = (
  process.env.ALLOWED_EMAIL_DOMAINS || "amrita.edu,cb.amrita.edu,ch.amrita.edu"
).split(",");

export function isAllowedEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return ALLOWED_DOMAINS.some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`)
  );
}

export function getDomainError(email: string): string | null {
  if (!email.includes("@")) return "Enter a valid email address.";
  if (!isAllowedEmail(email))
    return "Only Amrita college email addresses are allowed (e.g. @cb.amrita.edu).";
  return null;
}
