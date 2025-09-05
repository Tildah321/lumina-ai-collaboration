interface ClientAuth {
  id?: number;
  client_space_id: string;
  password_hash?: string;
  link_expiry?: string;
  is_active: boolean;
  link_token?: string;
}

class ClientAuthService {
  private baseUrl = 'https://app.nocodb.com/api/v1/db/data/noco/pg5rbl36x41ud93';
  private apiToken = 'PiPJbqfJYUrdeNA7n7hAsYt6fgLBFGRfcYFTRVdA';

  // Utiliser directement la table clients au lieu d'une table séparée
  private clientsTableId = 'mpd6txaj0t86ha7';

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'xc-token': this.apiToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // Créer/Mettre à jour mot de passe client directement dans table clients
  async setClientPassword(spaceId: string, password: string): Promise<void> {
    const passwordHash = btoa(password); // Simple encoding, à améliorer en production
    
    try {
      console.log('🔐 Setting password for client space:', spaceId);
      
      // Mettre à jour directement dans la table clients
      const response = await this.makeRequest(`/${this.clientsTableId}/${spaceId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          client_password_hash: passwordHash,
          client_access_enabled: true,
          updated_at: new Date().toISOString()
        })
      });
      
      console.log('✅ Password set successfully:', response);
    } catch (error) {
      console.error('❌ Error setting client password:', error);
      throw error;
    }
  }

  // Vérifier mot de passe client depuis table clients  
  async verifyClientPassword(spaceId: string, password: string): Promise<boolean> {
    try {
      console.log('🔍 Verifying password for space:', spaceId);
      
      const response = await this.makeRequest(`/${this.clientsTableId}/${spaceId}`);
      
      if (response && response.client_password_hash) {
        const passwordHash = btoa(password);
        const isValid = response.client_password_hash === passwordHash && response.client_access_enabled;
        console.log('✅ Password verification result:', isValid);
        return isValid;
      }
      
      // Si pas de mot de passe configuré
      console.log('🔓 No password configured for this space');
      return true; // Accès libre si pas de mot de passe
    } catch (error) {
      console.error('❌ Error verifying password:', error);
      return false;
    }
  }

  // Vérifier si un mot de passe est requis
  async hasPassword(spaceId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/${this.clientsTableId}/${spaceId}`);
      return !!(response && response.client_password_hash);
    } catch (error) {
      console.error('❌ Error checking password requirement:', error);
      return false;
    }
  }

  // Supprimer mot de passe client
  async removeClientPassword(spaceId: string): Promise<void> {
    try {
      console.log('🗑️ Removing password for client space:', spaceId);
      
      // Supprimer le mot de passe en mettant à null
      const response = await this.makeRequest(`/${this.clientsTableId}/${spaceId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          client_password_hash: null,
          updated_at: new Date().toISOString()
        })
      });
      
      console.log('✅ Password removed successfully:', response);
    } catch (error) {
      console.error('❌ Error removing client password:', error);
      throw error;
    }
  }
  async generateClientLink(spaceId: string): Promise<string> {
    try {
      console.log('🔗 Getting or generating secure client link for space:', spaceId);

      // D'abord, vérifier s'il existe déjà un token
      const existingClient = await this.makeRequest(`/${this.clientsTableId}/${spaceId}`);

      if (existingClient && existingClient.client_link_token) {
        console.log('✅ Using existing token:', existingClient.client_link_token);
        const secureLink = `${window.location.origin}/client/${existingClient.client_link_token}`;
        return secureLink;
      }

      // Générer un nouveau token seulement s'il n'en existe pas
      // Utiliser un format plus simple et plus fiable
      const token = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

      // Mettre à jour la table clients avec le nouveau token et activer l'accès
      const payload = {
        client_link_token: token.toLowerCase(), // Forcer en minuscules
        client_access_enabled: true,
        updated_at: new Date().toISOString()
      };

      console.log('🚀 Creating new token for client:', payload);

      const response = await this.makeRequest(`/${this.clientsTableId}/${spaceId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      console.log('✅ Client updated with new token:', response);

      const secureLink = `${window.location.origin}/client/${token.toLowerCase()}`;
      console.log('✅ Generated new secure link:', secureLink);

      return secureLink;
    } catch (error) {
      console.error('❌ Error generating client link:', error);
      // En cas d'erreur, fallback vers la vue directe par ID
      return `${window.location.origin}/client-view/${spaceId}`;
    }
  }

  // Valider token client avec retry et cache
  async validateClientToken(token: string): Promise<string | null> {
    try {
      // Nettoyer et normaliser le token
      const cleanToken = decodeURIComponent(String(token)).trim().toLowerCase();
      console.log('🔍 Validating clean token:', cleanToken);
      
      // Cache temporaire pour éviter de revalider le même token
      const cacheKey = `token_cache_${cleanToken}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { spaceId, timestamp } = JSON.parse(cached);
        // Cache valide pendant 5 minutes
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          console.log('✅ Using cached token validation:', spaceId);
          return spaceId;
        }
      }

      // Fonction retry avec délai progressif
      const retryRequest = async (attempt = 1): Promise<any> => {
        try {
          // Méthode directe la plus fiable
          const directResponse = await this.makeRequest(`/${this.clientsTableId}?limit=1000`);
          const items = directResponse?.list || [];
          
          const match = items.find((s: any) => {
            const tokenValue = String(s.client_link_token || '').trim().toLowerCase();
            return tokenValue === cleanToken;
          });
          
          if (match) {
            const isEnabled = match.client_access_enabled === true || 
                            match.client_access_enabled === 'true' || 
                            match.client_access_enabled === 1;
            
            if (isEnabled) {
              const spaceId = (match.Id || match.id || match.ID || match._id)?.toString();
              console.log('✅ Token valid, space ID:', spaceId);
              
              // Mettre en cache le résultat
              try {
                sessionStorage.setItem(cacheKey, JSON.stringify({
                  spaceId,
                  timestamp: Date.now()
                }));
              } catch (e) {
                console.log('Cache storage failed, continuing...');
              }
              
              return spaceId;
            } else {
              console.log('❌ Client access disabled for space');
              return null;
            }
          }

          // Si pas trouvé avec méthode directe, essayer les filtres
          const filters = [
            `(client_link_token,eq,'${cleanToken}')`,
            `client_link_token,like,${cleanToken}`,
            `client_link_token,eq,${cleanToken}`
          ];
          
          for (const filter of filters) {
            try {
              await new Promise(resolve => setTimeout(resolve, 100)); // Délai entre requêtes
              const where = encodeURIComponent(filter);
              const response = await this.makeRequest(`/${this.clientsTableId}?where=${where}`);
              
              if (response.list && response.list.length > 0) {
                const space = response.list[0];
                const isEnabled = space.client_access_enabled === true || 
                                space.client_access_enabled === 'true' || 
                                space.client_access_enabled === 1;
                
                if (isEnabled) {
                  const spaceId = (space.Id || space.id || space.ID || space._id)?.toString();
                  console.log('✅ Token valid via filter, space ID:', spaceId);
                  
                  // Mettre en cache
                  try {
                    sessionStorage.setItem(cacheKey, JSON.stringify({
                      spaceId,
                      timestamp: Date.now()
                    }));
                  } catch (e) {}
                  
                  return spaceId;
                }
              }
            } catch (filterError) {
              console.log('⚠️ Filter failed:', filter, filterError);
              continue;
            }
          }
          
          return null;
        } catch (error) {
          // Retry avec délai progressif si erreur réseau/429
          if (attempt < 3 && (error.message.includes('429') || error.message.includes('network'))) {
            console.log(`⏳ Retry attempt ${attempt + 1} in ${attempt * 1000}ms...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            return retryRequest(attempt + 1);
          }
          throw error;
        }
      };

      const result = await retryRequest();
      
      if (!result) {
        console.log('❌ No valid space found for token');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error validating token:', error);
      return null;
    }
  }
}

export const clientAuthService = new ClientAuthService();
export default clientAuthService;