'use client';

// Sistema de controle de anúncios carregados
class AdManager {
  private static loadedAds = new Set<string>();
  
  static isLoaded(adId: string): boolean {
    return this.loadedAds.has(adId);
  }
  
  static markAsLoaded(adId: string): void {
    this.loadedAds.add(adId);
  }
  
  static reset(): void {
    this.loadedAds.clear();
  }
}

export default AdManager;