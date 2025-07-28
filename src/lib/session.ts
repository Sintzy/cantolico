import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getSession() {
  return await getServerSession(authOptions);
}
