export function configuredSuperAdminEmails() {
  return (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isConfiguredSuperAdmin(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return configuredSuperAdminEmails().includes(normalizedEmail);
}
