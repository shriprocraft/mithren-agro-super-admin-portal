// Privacy-safe presentation (scope §4.1): customer contact details are masked everywhere in the
// admin UI. The demo offers no "reveal" action because the access policy for full contact details
// is not defined (docs/NEEDS_CLARIFICATION.md Q-PII).

/** "ananya.iyer@example.com" → "an•••••••••@example.com" */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  const visible = local.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

/** "+91 90000 10001" → "+91 ••••• •0001" (last four digits kept). */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `+${digits.slice(0, 2)} ••••• •${digits.slice(-4)}`;
}
