export type Status = 'active' | 'inactive' | 'pending';

export interface User {
  id: string;
  status: Status;
}