import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cânticos Católicos",
  description: "Descobre e pesquisa cânticos católicos para a liturgia. Mais de 100 cânticos organizados por momentos litúrgicos, instrumentos e tags no Can♱ólico!",
  keywords: ["cânticos católicos", "música litúrgica", "cancioneiro", "igreja", "liturgia", "acordes", "partituras"],
  openGraph: {
    title: "Cânticos Católicos | Can♱ólico!",
    description: "Descobre e pesquisa cânticos católicos para a liturgia. Cancioneiro colaborativo com acordes e partituras.",
    type: "website",
  },
};

export default function MusicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
