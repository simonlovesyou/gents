export type User = {
  id: string;
  status: 'active' | 'inactive' | 'pending';
} | undefined