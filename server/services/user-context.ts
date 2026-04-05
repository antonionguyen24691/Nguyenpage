const DEFAULT_USER_EMAIL = process.env.DEFAULT_USER_EMAIL ?? "stock.local@banker-system.local";
const DEFAULT_USER_NAME = process.env.DEFAULT_USER_NAME ?? "Stock Local User";

export async function getCurrentUser(emailHint?: string) {
  const email = (emailHint ?? DEFAULT_USER_EMAIL).trim().toLowerCase();
  return {
    id: "local-stock-user",
    email,
    name: DEFAULT_USER_NAME,
  };
}
