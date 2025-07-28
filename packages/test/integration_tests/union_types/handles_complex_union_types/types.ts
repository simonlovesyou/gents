export type GuestUser = { email: string };
export type LoggedInUser = { id: string; email: string; name: string };
export type User = GuestUser | LoggedInUser;