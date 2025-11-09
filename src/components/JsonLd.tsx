'use client';

import { useEffect } from 'react';

export default function JsonLd() {
  useEffect(() => {
    // Adicionar JSON-LD apenas no lado do cliente
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": ["WebSite", "MusicGroup", "Organization"],
      "name": "Cantólico - Cânticos Católicos",
      "alternateName": ["Cantolico", "Cantólico!", "Canticos Catolicos", "Cânticos Católicos Online"],
      "description": "Biblioteca completa de cânticos católicos com letras, acordes e partituras gratuitas. Colecção de música litúrgica portuguesa para celebrações e liturgia.",
      "url": "https://cantolico.pt",
      "sameAs": [
        "https://instagram.com/cantolicoo",
        "https://github.com/sintzy/cantolico"
      ],
      "potentialAction": [
        {
          "@type": "SearchAction",
          "target": "https://cantolico.pt/musics#{search_term_string}",
          "query-input": "required name=search_term_string"
        }
      ],
      "publisher": {
        "@type": "Organization",
        "name": "Cantólico - Cânticos Católicos",
        "url": "https://cantolico.pt",
        "logo": "https://cantolico.pt/cantolicoemail.png"
      },
      "mainEntity": {
        "@type": "ItemList",
        "name": "Lista de Cânticos Católicos",
        "description": "Biblioteca completa de cânticos católicos portugueses com letras, acordes e partituras para missa e liturgia"
      },
      "audience": {
        "@type": "Audience",
        "audienceType": ["Catholics", "Musicians", "Church Musicians", "Liturgy Teams", "Catolicos", "Musicos Igreja"]
      },
      "keywords": "lista canticos catolicos, canticos catolicos online, letras canticos catolicos, acordes canticos catolicos, biblioteca canticos catolicos, cancioneiro catolico online, musica liturgica online, hinario catolico, canticos missa, Deus esta aqui, Ave Maria, Santo, Gloria, Aleluia"
    });
    
    document.head.appendChild(script);

    // Cleanup
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return null;
}