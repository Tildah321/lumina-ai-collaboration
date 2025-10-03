import { useState, useCallback, useRef } from 'react';
import { Prospect } from '@/types/prospect';
import nocodbService from '@/services/nocodbService';
import { useToast } from '@/hooks/use-toast';

const PROSPECT_COMPANY_COLUMN = 'cxi03jrd1enf3n2';
const PROSPECT_PHONE_COLUMN = 'ch2fw3p077t9y6w';
const PROSPECT_SITE_COLUMN = 'coo7e2wbo6zvvux';
const PAGE_SIZE = 20;

interface ProspectCache {
  prospects: Prospect[];
  isLoading: boolean;
  hasMore: boolean;
  offset: number;
}

export const useProspectCache = () => {
  const { toast } = useToast();
  const [cache, setCache] = useState<ProspectCache>({
    prospects: [],
    isLoading: false,
    hasMore: true,
    offset: 0
  });
  
  const loadingRef = useRef(false);

  const mapNocoToProspect = useCallback((record: Record<string, unknown>): Prospect => {
    const id = ((record as any).Id || (record as any).id || '').toString();
    const name = (record.name as string) || '';
    const company = (
      record[PROSPECT_COMPANY_COLUMN] ||
      record.entreprise ||
      record.company ||
      record.Entreprise ||
      record.societe ||
      record.société ||
      ''
    ) as string;
    
    const email = (record.email as string) || '';
    
    const phone = (
      record[PROSPECT_PHONE_COLUMN] ||
      record.telephone ||
      record.numero ||
      record.phone ||
      record.tel ||
      record.mobile ||
      record.portable ||
      record.Téléphone ||
      record.Telephone ||
      ''
    ) as string;
    
    const website = (
      record[PROSPECT_SITE_COLUMN] ||
      record.site ||
      record.reseaux ||
      record.website ||
      record.site_web ||
      record.reseaux_site ||
      record['Réseaux / Site'] ||
      record.url ||
      ''
    ) as string;
    
    const statusMap: Record<string, string> = {
      'nouveau': 'Nouveau',
      'en_contact': 'En contact',
      'en_discussion': 'En discussion',
      'proposition': 'Proposition',
      'converti': 'Converti'
    };
    
    const rawStatus = (record.status as string) || 'nouveau';
    const status = statusMap[rawStatus.toLowerCase()] || 'Nouveau';
    
    const lastContact = (
      record.lastContact ||
      record.dernier_contact ||
      ''
    ) as string;

    return { id, name, company, email, phone, website, status, lastContact };
  }, []);

  const buildProspectPayload = useCallback((prospect: Partial<Prospect>) => {
    const statusMap: Record<string, string> = {
      'Nouveau': 'nouveau',
      'En contact': 'en_contact',
      'En discussion': 'en_discussion',
      'Proposition': 'proposition',
      'Converti': 'converti'
    };

    return {
      name: prospect.name || '',
      email: prospect.email || '',
      [PROSPECT_COMPANY_COLUMN]: prospect.company || '',
      [PROSPECT_PHONE_COLUMN]: prospect.phone || '',
      [PROSPECT_SITE_COLUMN]: prospect.website || '',
      status: statusMap[prospect.status || 'Nouveau'] || 'nouveau',
      dernier_contact: prospect.lastContact || new Date().toISOString().split('T')[0]
    };
  }, []);

  const loadProspects = useCallback(async (forceRefresh = false) => {
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    setCache(prev => ({ ...prev, isLoading: true }));

    try {
      const offset = forceRefresh ? 0 : cache.offset;
      const response = await nocodbService.getProspects(
        PAGE_SIZE,
        offset,
        forceRefresh,
        { onlyCurrentUser: true }
      );

      const list = (response.list || []).map(mapNocoToProspect);

      setCache(prev => ({
        prospects: forceRefresh ? list : [...prev.prospects, ...list],
        isLoading: false,
        hasMore: list.length === PAGE_SIZE,
        offset: forceRefresh ? list.length : prev.offset + list.length
      }));
    } catch (error) {
      console.error('Erreur chargement prospects:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les prospects',
        variant: 'destructive'
      });
      setCache(prev => ({ ...prev, isLoading: false }));
    } finally {
      loadingRef.current = false;
    }
  }, [cache.offset, mapNocoToProspect, toast]);

  const createProspect = useCallback(async (prospect: Partial<Prospect>) => {
    try {
      const payload = buildProspectPayload({ ...prospect, status: prospect.status || 'Nouveau' });
      const response = await nocodbService.createProspect(payload) as Record<string, unknown>;
      const created = mapNocoToProspect(response);

      setCache(prev => ({
        ...prev,
        prospects: [created, ...prev.prospects],
        offset: prev.offset + 1
      }));

      toast({
        title: 'Succès',
        description: 'Prospect créé avec succès'
      });

      setTimeout(() => loadProspects(true), 300);
      return created;
    } catch (error) {
      console.error('Erreur création prospect:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le prospect',
        variant: 'destructive'
      });
      throw error;
    }
  }, [buildProspectPayload, mapNocoToProspect, toast, loadProspects]);

  const updateProspect = useCallback(async (id: string, updates: Partial<Prospect>) => {
    const previous = cache.prospects.find(p => p.id === id);
    if (!previous) return;

    const optimisticUpdate = { ...previous, ...updates };
    setCache(prev => ({
      ...prev,
      prospects: prev.prospects.map(p => p.id === id ? optimisticUpdate : p)
    }));

    try {
      const payload = buildProspectPayload(optimisticUpdate);
      await nocodbService.updateProspect(id, payload);

      toast({
        title: 'Succès',
        description: 'Prospect mis à jour avec succès'
      });

      setTimeout(() => loadProspects(true), 300);
    } catch (error) {
      console.error('Erreur mise à jour prospect:', error);
      setCache(prev => ({
        ...prev,
        prospects: prev.prospects.map(p => p.id === id ? previous : p)
      }));
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le prospect',
        variant: 'destructive'
      });
      throw error;
    }
  }, [cache.prospects, buildProspectPayload, toast, loadProspects]);

  const deleteProspect = useCallback(async (id: string) => {
    const previous = [...cache.prospects];

    setCache(prev => ({
      ...prev,
      prospects: prev.prospects.filter(p => p.id !== id),
      offset: Math.max(0, prev.offset - 1)
    }));

    try {
      await nocodbService.deleteProspect(id);
      toast({
        title: 'Succès',
        description: 'Prospect supprimé avec succès'
      });
    } catch (error) {
      console.error('Erreur suppression prospect:', error);
      setCache(prev => ({
        ...prev,
        prospects: previous
      }));
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le prospect',
        variant: 'destructive'
      });
      throw error;
    }
  }, [cache.prospects, toast]);

  const updateProspectStatus = useCallback(async (id: string, status: string) => {
    await updateProspect(id, { status });
  }, [updateProspect]);

  return {
    prospects: cache.prospects,
    isLoading: cache.isLoading,
    hasMore: cache.hasMore,
    loadProspects,
    createProspect,
    updateProspect,
    deleteProspect,
    updateProspectStatus
  };
};
