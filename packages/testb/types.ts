type SubscriptionTier = "free" | "basic" | "business" | undefined;

interface User {
  id: string;
  avatar: {
    url: string;
  };
  birthday?: Date;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionTier: SubscriptionTier;
  card: {
    currencyCode: string;
  };
  friends: Array<{ id: string }>;
}
