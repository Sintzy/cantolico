import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      role: "USER" | "TRUSTED" | "REVIEWER" | "ADMIN";
      emailVerified: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    role: "USER" | "TRUSTED" | "REVIEWER" | "ADMIN";
    emailVerified: Date | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    bio?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "USER" | "TRUSTED" | "REVIEWER" | "ADMIN";
    emailVerified?: boolean;
  }
}