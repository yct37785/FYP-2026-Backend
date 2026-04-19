export const NOTIFICATION_MSGS = {
  BOOKING: {
    CONFIRMED: (eventTitle: string) =>
      `Your booking for "${eventTitle}" is confirmed.`,
    CANCELLED_REFUNDED: (eventTitle: string, refundAmount: number) =>
      `Your booking for "${eventTitle}" has been cancelled and you have been refunded the full amount of $${refundAmount.toFixed(2)}.`,
    PROMOTED_FROM_WAITLIST: (eventTitle: string) =>
      `You have been promoted from the waitlist to a confirmed booking for "${eventTitle}".`,
  },
  WAITLIST: {
    JOINED: (eventTitle: string) =>
      `You have joined the waitlist for "${eventTitle}".`,
    REMOVED: (eventTitle: string) =>
      `You have been removed from the waitlist for "${eventTitle}".`,
    SUSPENDED: (eventTitle: string) =>
      `Your waitlist for "${eventTitle}" has been suspended by an administrator.`,
  },
  EVENT: {
    DELETED: (eventTitle: string) =>
      `The event "${eventTitle}" has been cancelled.`,
    SUSPENDED: (eventTitle: string) =>
      `Your event "${eventTitle}" has been suspended by an administrator.`,
  },
  REVIEW: {
    SUSPENDED: (eventTitle: string) =>
      `Your review for "${eventTitle}" has been suspended by an administrator.`,
  },
  REPORT: {
    DISMISSED: (reportId: number) =>
      `Your report #${reportId} has been reviewed and dismissed.`,
    RESOLVED_EVENT: (reportId: number, eventTitle: string) =>
      `Your report #${reportId} has been resolved. The event "${eventTitle}" has been suspended.`,
    RESOLVED_REVIEW: (reportId: number, eventTitle: string) =>
      `Your report #${reportId} has been resolved. A review on "${eventTitle}" has been suspended.`,
  },
} as const;