import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conta",
  description: "Gerir a tua conta no Cantólico! - Cancioneiro católico colaborativo.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
