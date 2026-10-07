/** Reads a mandatory environment variable (see apps/api/.env.example). */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set (see apps/api/.env.example)`);
  }
  return value;
}
