import { useState, useEffect } from 'react';
import nocodbService from '@/services/nocodbService';
import { useToast } from '@/hooks/use-toast';

export const useNocoDB = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleError = (error: any, message: string) => {
    console.error(message, error);
    toast({
      title: "Erreur",
      description: message,
      variant: "destructive"
    });
  };

  const loadData = async <T>(loadFunction: () => Promise<T>): Promise<T | null> => {
    setIsLoading(true);
    try {
      const result = await loadFunction();
      return result;
    } catch (error) {
      handleError(error, "Erreur lors du chargement des données");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const mutateData = async <T>(mutateFunction: () => Promise<T>, successMessage?: string): Promise<T | null> => {
    setIsLoading(true);
    try {
      const result = await mutateFunction();
      if (successMessage) {
        toast({
          title: "Succès",
          description: successMessage
        });
      }
      return result;
    } catch (error) {
      handleError(error, "Erreur lors de l'opération");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    loadData,
    mutateData,
    nocodbService
  };
};

export default useNocoDB;