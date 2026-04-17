export const NOTIFICATION_MSGS = {
  BOOKING: {
    CONFIRMED: (eventTitle: string) =>
      `Your booking for "${eventTitle}" is confirmed.`,
    CANCELLED_REFUNDED: (eventTitle: string) =>
      `Your booking for "${eventTitle}" has been cancelled and you have been refunded the full amount.`,
    PROMOTED_FROM_WAITLIST: (eventTitle: string) =>
      `You have been promoted from the waitlist to a confirmed booking for "${eventTitle}".`,
  },
  WAITLIST: {
    JOINED: (eventTitle: string) =>
      `You have joined the waitlist for "${eventTitle}".`,
    REMOVED: (eventTitle: string) =>
      `You have been removed from the waitlist for "${eventTitle}".`,
  },
  EVENT: {
    DELETED: (eventTitle: string) =>
      `The event "${eventTitle}" has been cancelled.`,
  },
} as const;