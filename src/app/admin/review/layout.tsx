import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Revisão de Submissões",
  description: "Revisar e aprovar submissões de cânticos católicos no Can♱ólico!",
};

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
