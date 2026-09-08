import type { DefaultSession } from "next-auth";
import type { AccountStatus, Plan } from "@/lib/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      plan: Plan;
      status: AccountStatus;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    plan?: Plan;
    status?: AccountStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?:        string;
    role?:      string;
    plan?:      Plan;
    status?:    AccountStatus;
    claimsAt?:  number;
    picture?:   string;
    iat?:       number;
    exp?:       number;
  }
}
