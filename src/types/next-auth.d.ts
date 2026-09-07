import type { DefaultSession } from "next-auth";
import type { Plan } from "@/lib/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      plan: Plan;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    plan?: Plan;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?:        string;
    role?:      string;
    plan?:      Plan;
    claimsAt?:  number;
    picture?:   string;
    iat?:       number;
    exp?:       number;
  }
}
