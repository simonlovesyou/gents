export interface Company {
  id: number;
  name: number;
}

export interface FullUser {
  company: Company;
}

export declare const getUser: () => Promise<FullUser> | undefined;

export type User = NonNullable<Awaited<ReturnType<typeof getUser>>>;
