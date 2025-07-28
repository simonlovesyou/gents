export interface Friend {
  id: string;
  name: string;
}

export interface User {
  id: string;
  friends: Friend[];
}