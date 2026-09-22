export type IssueMail = {
  category: string;
  message: string;
  url: string;
  viewport: string;
  userAgent: string;
  reporterName: string;
  reporterEmail: string;
  reporterRole: string;
  reportId: string;
};

export type MailProvider = "resend" | "web3forms" | "none";

export type MailResult = { ok: boolean; error?: string; retryable?: boolean };
