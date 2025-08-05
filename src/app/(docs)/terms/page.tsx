"use client";

import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

export default function TermsPage() {
  const [active, setActive] = useState<string | undefined>(undefined);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
      <h1 className="text-3xl font-bold border-b-2 border-sky-500 pb-2">Termos e Condições de Utilização</h1>

      <p className="text-muted-foreground text-sm">
        Ao utilizar este website, está a concordar com os presentes termos de utilização. Leia com atenção.
      </p>

      <Accordion type="single" collapsible className="space-y-4" value={active} onValueChange={setActive}>
        <AccordionItem value="1">
          <AccordionTrigger>1. Objeto e Titularidade</AccordionTrigger>
          <AccordionContent>
            Este site é propriedade e responsabilidade de Cantólico!, com o objetivo de disponibilizar um cancioneiro digital católico. A utilização do site implica a aceitação plena e sem reservas dos presentes termos.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="2">
          <AccordionTrigger>2. Acesso e Utilização</AccordionTrigger>
          <AccordionContent>
            O acesso é livre, mas funcionalidades como submissão de músicas requerem autenticação. Utilizadores comprometem-se a fornecer informação verdadeira.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="3">
          <AccordionTrigger>3. Conteúdo Submetido</AccordionTrigger>
          <AccordionContent>
            Todo o conteúdo submetido (letras, acordes, PDFs, áudio, etc.) é da responsabilidade do utilizador. O site reserva-se o direito de moderar, editar ou remover submissões que infrinjam direitos ou contrariem a finalidade do projeto.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="4">
          <AccordionTrigger>5. Responsabilidade e Limitações</AccordionTrigger>
          <AccordionContent>
            O site não se responsabiliza por falhas técnicas ou pelos conteúdos submetidos por terceiros. Reservamo-nos o direito de suspender ou terminar funcionalidades sem aviso prévio.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="5">
          <AccordionTrigger>6. Privacidade e Dados Pessoais</AccordionTrigger>
          <AccordionContent>
            Os dados pessoais recolhidos (nome, email, etc.) são tratados conforme o Regulamento Geral sobre a Proteção de Dados (RGPD - Regulamento (UE) 2016/679). Garantimos o direito à consulta, alteração ou remoção dos dados pessoais a qualquer momento.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="6">
          <AccordionTrigger>7. Cookies</AccordionTrigger>
          <AccordionContent>
            Utilizamos cookies apenas para melhorar a experiência de navegação e funcionalidades essenciais. Pode gerir as suas preferências no navegador.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="7">
          <AccordionTrigger>8. Alterações aos Termos</AccordionTrigger>
          <AccordionContent>
            Reservamo-nos o direito de atualizar estes termos a qualquer momento. As alterações serão publicadas nesta página com data atualizada. Recomenda-se a revisão periódica.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="8">
          <AccordionTrigger>9. Lei Aplicável e Foro</AccordionTrigger>
          <AccordionContent>
            Estes termos regem-se pela legislação portuguesa. Para qualquer litígio será competente o foro da comarca de [Localidade], com expressa renúncia a qualquer outro.
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator />

      <p className="text-xs text-muted-foreground">
        Versão atualizada em 25/07/2025. Estes termos podem ser alterados sem aviso prévio. É da responsabilidade do utilizador consultar regularmente esta página para se manter informado sobre quaisquer alterações.
      </p>
    </div>
  );
}