import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      role: "USER" | "TRUSTED" | "REVIEWER" | "ADMIN";
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    role: "USER" | "TRUSTED" | "REVIEWER" | "ADMIN";
    name?: string | null;
    email?: string | null;
    image?: string | null;
    bio?: string | null;
  }
}
