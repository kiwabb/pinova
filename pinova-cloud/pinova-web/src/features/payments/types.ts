export type PaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CLOSED"
  | "REVIEW_REQUIRED";

export type MockPaymentOutcome = "SUCCESS" | "FAILED";

export interface PaymentOrder {
  paymentNo: string;
  checkoutNo: string;
  providerCode: string;
  status: PaymentStatus;
  currencyCode: string;
  amountFen: number;
  orderCount: number;
  expiresAt: string;
  paidAt: string | null;
  failureMessage: string | null;
  mockMode: boolean;
}
