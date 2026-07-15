export const CONTACT_TOPICS = [
  "Order issue",
  "Shipping & delivery",
  "Returns & exchanges",
  "Payment issue",
  "Sizing & fit help",
  "Product question",
  "Account & login issue",
  "Bulk / wholesale order",
  "Partnership & collaboration",
  "Press inquiry",
  "Feedback & suggestions",
  "Something else",
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];