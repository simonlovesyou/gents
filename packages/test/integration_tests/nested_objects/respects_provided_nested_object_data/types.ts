export interface Address {
  street: string;
  city: string;
}

export interface User {
  id: string;
  address: Address;
}