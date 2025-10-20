/**
 * Componente de Teste para Anúncios Google AdSense
 * 
 * Este componente permite testar anúncios em desenvolvimento
 * mostrando placeholders que simulam os anúncios reais
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ADSENSE_CONFIG } from '@/lib/adsense-config';

interface AdTestProps {
  slot: keyof typeof ADSENSE_CONFIG.SLOTS;
  title: string;
  description: string;
  size: string;
  location: string;
  devices: string;
}

const AdTestPlaceholder = ({ slot, title, description, size, location, devices }: AdTestProps) => {
  const [clicked, setClicked] = useState(false);
  
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant="outline">{size}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Localização:</strong> {location}
          </div>
          <div>
            <strong>Dispositivos:</strong> {devices}
          </div>
          <div>
            <strong>Slot ID:</strong> <code>{ADSENSE_CONFIG.SLOTS[slot]}</code>
          </div>
          <div>
            <strong>Status:</strong> 
            <Badge className="ml-2" variant={clicked ? "default" : "secondary"}>
              {clicked ? "Testado ✓" : "Aguardando"}
            </Badge>
          </div>
        </div>
        
        {/* Simulação do anúncio */}
        <div className="mt-4 p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-center">
          <div className="text-gray-600 mb-2">📢 SIMULAÇÃO DO ANÚNCIO</div>
          <div className="text-sm text-gray-500 mb-3">{size} - {slot}</div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setClicked(!clicked)}
          >
            {clicked ? "Testado!" : "Simular Clique"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function AdSenseTestPage() {
  const adUnits: AdTestProps[] = [
    // Página de Música Individual
    {
      slot: 'MUSIC_SIDEBAR',
      title: 'Music Sidebar Banner',
      description: 'Banner na sidebar da página de música individual',
      size: '300x250',
      location: 'Sidebar direita, após tags',
      devices: 'Desktop apenas'
    },
    {
      slot: 'MUSIC_MOBILE',
      title: 'Music Mobile Banner',
      description: 'Banner mobile na página de música',
      size: '320x280',
      location: 'Após letra, antes YouTube',
      devices: 'Mobile apenas'
    },
    {
      slot: 'MUSIC_FOOTER',
      title: 'Music Footer Banner',
      description: 'Banner horizontal no final da música',
      size: '728x90 / 320x100',
      location: 'Final da página',
      devices: 'Todos'
    },
    
    // Lista de Músicas
    {
      slot: 'MUSIC_LIST_TOP',
      title: 'Music List Top Banner',
      description: 'Banner no topo da lista de músicas',
      size: '728x90 / 320x100',
      location: 'Após filtros',
      devices: 'Todos'
    },
    {
      slot: 'MUSIC_LIST_SIDEBAR',
      title: 'Music List Sidebar',
      description: 'Banner na sidebar da lista de músicas',
      size: '300x600',
      location: 'Sidebar com filtros',
      devices: 'Desktop apenas'
    },
    {
      slot: 'MUSIC_LIST_BOTTOM',
      title: 'Music List Bottom Banner',
      description: 'Banner no final da lista de músicas',
      size: '728x90 / 320x100',
      location: 'Antes da paginação',
      devices: 'Todos'
    },
    
    // Playlists
    {
      slot: 'PLAYLIST_LIST',
      title: 'Playlist List Banner',
      description: 'Banner na lista de playlists',
      size: '728x90 / 320x100',
      location: 'Entre header e lista',
      devices: 'Todos'
    },
    {
      slot: 'PLAYLIST_LIST_SIDEBAR',
      title: 'Playlist List Sidebar',
      description: 'Banner na sidebar da lista de playlists',
      size: '300x250',
      location: 'Sidebar direita',
      devices: 'Desktop apenas'
    },
    {
      slot: 'PLAYLIST_VIEW',
      title: 'Playlist View Banner',
      description: 'Banner na visualização de playlist individual',
      size: '728x90 / 320x100',
      location: 'Após info, antes das músicas',
      devices: 'Todos'
    },
    
    // Outras páginas
    {
      slot: 'STARRED_SONGS',
      title: 'Starred Songs Banner',
      description: 'Banner na página de músicas favoritas',
      size: '728x90 / 320x100',
      location: 'Após filtros',
      devices: 'Todos'
    },
    {
      slot: 'EXPLORE_PLAYLISTS',
      title: 'Explore Playlists Banner',
      description: 'Banner na página de explorar playlists',
      size: '728x90 / 320x100',
      location: 'Topo da página',
      devices: 'Todos'
    },
    {
      slot: 'GENERIC_BANNER',
      title: 'Generic Banner',
      description: 'Banner genérico para outras páginas',
      size: '728x90 / 320x100',
      location: 'Variável',
      devices: 'Todos'
    }
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4">🧪 Teste de Ad Units - Google AdSense</h1>
        <p className="text-gray-600 mb-4">
          Esta página mostra todas as ad units configuradas para o site.
          Em desenvolvimento, você verá placeholders como abaixo.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Badge variant="outline">Total: {adUnits.length} Ad Units</Badge>
          <Badge variant={ADSENSE_CONFIG.TEST_MODE ? "default" : "secondary"}>
            Modo: {ADSENSE_CONFIG.TEST_MODE ? "Teste" : "Produção"}
          </Badge>
          <Badge variant="outline">Publisher: {ADSENSE_CONFIG.CLIENT_ID}</Badge>
        </div>
      </div>

      <div className="space-y-6">
        {adUnits.map((adUnit, index) => (
          <AdTestPlaceholder key={index} {...adUnit} />
        ))}
      </div>

      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h3 className="font-bold mb-2">📋 Como usar:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Crie as ad units no painel do Google AdSense</li>
          <li>Copie os data-ad-slot de cada unit</li>
          <li>Substitua os valores em <code>src/lib/adsense-config.ts</code></li>
          <li>Os anúncios reais aparecerão em produção</li>
        </ol>
      </div>
    </div>
  );
}