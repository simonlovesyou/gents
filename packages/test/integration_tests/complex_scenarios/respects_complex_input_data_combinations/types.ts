export type SubscriptionTier = 'free' | 'basic' | 'business' | undefined;

export interface User {
  id: string;
  firstName: string;
  subscriptionTier: SubscriptionTier;
  friends: Array<{id: string}>;
}