/* eslint-disable @typescript-eslint/no-explicit-any */
interface NocoDBConfig {
  apiToken: string;
  baseUrl: string;
  tableIds: {
    clients: string;
    projets: string;
    taches: string;
    jalons: string;
    factures: string;
    tachesInternes: string;
    prospects: string;
  };
}

import { supabase } from '@/integrations/supabase/client';

class NocoDBService {
  private config: NocoDBConfig;
  private cachedProjectIds: string[] | null = null;

  constructor() {
    this.config = {
      apiToken: 'PiPJbqfJYUrdeNA7n7hAsYt6fgLBFGRfcYFTRVdA',
      baseUrl: 'https://app.nocodb.com/api/v1/db/data/noco/pg5rbl36x41ud93',
      tableIds: {
        clients: 'mpd6txaj0t86ha7',
        projets: 'mpd6txaj0t86ha7', // Les projets sont dans la même table que les clients
        taches: 'mon8rt3orldc3nc',
        jalons: 'mkpfjd0kb9xvh17',
        factures: 'm6budmy04sawh66',
        tachesInternes: 'mz1vdjs96rg98gw',
        prospects: 'mjz7jie90f0ygw4'
      }
    };
  }

  // Get current user ID from Supabase
  private async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  }

  // Get user's space IDs from mapping table
  private async getUserSpaceIds(): Promise<string[]> {
    const userId = await this.getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('noco_space_owners')
      .select('space_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user spaces:', error);
      return [];
    }

    return data?.map(item => item.space_id) || [];
  }

  // Register space ownership for current user
  private async registerSpaceOwnership(spaceId: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
      .from('noco_space_owners')
      .upsert({ user_id: userId, space_id: spaceId })
      .select();

    if (error) {
      console.error('Error registering space ownership:', error);
    }
  }

  // Cache agressif pour NocoDB gratuit - minimiser les appels
  private static requestCache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 300000; // 5 minutes pour réduire drastiquement les appels
  private static ongoingRequests = new Map<string, Promise<any>>(); // Éviter les doublons

  private invalidateCache(endpoint: string) {
    const url = `${this.config.baseUrl}${endpoint}`;
    for (const key of NocoDBService.requestCache.keys()) {
      if (key.startsWith(url)) {
        NocoDBService.requestCache.delete(key);
      }
    }
  }

  private invalidateProjectCache() {
    this.cachedProjectIds = null;
  }
  
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0,
    useCache = true
  ) {
    const maxRetries = 1;
    const url = `${this.config.baseUrl}${endpoint}`;
    const method = options.method || 'GET';
    const cacheKey = `${method}:${url}`;

    // Pour les GET, vérifier le cache d'abord et éviter les doublons
    if (method === 'GET' && useCache) {
      const cached = NocoDBService.requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < NocoDBService.CACHE_DURATION) {
        return cached.data;
      }
      
      // Si une requête est déjà en cours, attendre son résultat
      const ongoingRequest = NocoDBService.ongoingRequests.get(cacheKey);
      if (ongoingRequest) {
        return await ongoingRequest;
      }
    }
    
    // Délai plus long entre les requêtes
    if (retryCount > 0) {
      await new Promise(resolve => setTimeout(resolve, 8000 * retryCount));
    }
    
    // Marquer la requête comme en cours pour éviter les doublons
    let requestPromise: Promise<any>;
    if (method === 'GET' && useCache) {
      requestPromise = this.executeRequest(url, options, retryCount, maxRetries);
      NocoDBService.ongoingRequests.set(cacheKey, requestPromise);
    } else {
      requestPromise = this.executeRequest(url, options, retryCount, maxRetries);
    }

    try {
      const result = await requestPromise;
      
      // Mettre en cache les réponses GET réussies
      if (method === 'GET' && useCache && result) {
        NocoDBService.requestCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }
      
      return result;
    } finally {
      // Nettoyer la requête en cours
      if (method === 'GET' && useCache) {
        NocoDBService.ongoingRequests.delete(cacheKey);
      }
    }
  }

  private async executeRequest(url: string, options: RequestInit, retryCount: number, maxRetries: number): Promise<any> {
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'xc-token': this.config.apiToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      // Gérer le throttling de manière optimisée
      if (response.status === 429) {
        if (retryCount < maxRetries) {
          const delay = 10000 + (retryCount * 5000); // 10s, 15s
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.executeRequest(url, options, retryCount + 1, maxRetries);
        } else {
          return { list: [], pageInfo: { totalRows: 0 } };
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ NocoDB Error Details:', errorText);
        // Retourner des données vides pour les erreurs aussi
        if (response.status >= 500) {
          return { list: [], pageInfo: { totalRows: 0 } };
        }
        throw new Error(`NocoDB API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (retryCount < maxRetries && (error as Error).message.includes('fetch')) {
        const delay = 3000 + (retryCount * 2000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeRequest(url, options, retryCount + 1, maxRetries);
      }
      
      return { list: [], pageInfo: { totalRows: 0 } };
    }
  }

  // Clients - Filtered by user
  async getClients(forceRefresh = false) {
    const userSpaceIds = await this.getUserSpaceIds();
    if (userSpaceIds.length === 0) {
      // Return empty list if user has no spaces
      return { list: [], pageInfo: { totalRows: 0 } };
    }

    const response = await this.makeRequest(
      `/${this.config.tableIds.clients}`,
      {},
      0,
      !forceRefresh
    );
    
    // Filter by user's owned spaces
    const filteredList = (response.list || []).filter((client: any) => {
      const clientId = (client.Id || client.id)?.toString();
      return userSpaceIds.includes(clientId);
    });

    return {
      ...response,
      list: filteredList,
      pageInfo: { ...response.pageInfo, totalRows: filteredList.length }
    };
  }

  // Fetch a single client space filtered by user ownership
  async getClientById(id: string, forceRefresh = false) {
    const userSpaceIds = await this.getUserSpaceIds();
    if (!userSpaceIds.includes(id)) {
      return null;
    }

    return this.makeRequest(
      `/${this.config.tableIds.clients}/${id}`,
      {},
      0,
      !forceRefresh
    );
  }

  // Public: fetch a client by ID without ownership filtering (for client token access)
  async getClientByIdPublic(id: string, forceRefresh = false) {
    return this.makeRequest(
      `/${this.config.tableIds.clients}/${id}`,
      {},
      0,
      !forceRefresh
    );
  }
  
  // Public endpoints for client-portal (no Supabase ownership filtering)
  async getTasksPublic(projetId: string) {
    return this.makeRequest(`/${this.config.tableIds.taches}?where=(projet_id,eq,${projetId})`);
  }
  
  async getMilestonesPublic(projetId: string) {
    return this.makeRequest(`/${this.config.tableIds.jalons}?where=(projet_id,eq,${projetId})`);
  }
  
  async getInvoicesPublic(projetId: string) {
    return this.makeRequest(`/${this.config.tableIds.factures}?where=(projet_id,eq,${projetId})`);
  }

  // Chargement séquentiel pour éviter de surcharger NocoDB gratuit
  async getSpaceData(
    projetId: string,
    isPublic = false,
    options: { onlyCurrentUser?: boolean } = {}
  ) {
    // Chargement séquentiel avec délais pour éviter rate limiting
    const tasks = isPublic
      ? await this.getTasksPublic(projetId)
      : await this.getTasks(projetId, options);
    
    await new Promise(resolve => setTimeout(resolve, 200)); // Petit délai
    
    const milestones = isPublic
      ? await this.getMilestonesPublic(projetId)
      : await this.getMilestones(projetId);
    
    await new Promise(resolve => setTimeout(resolve, 200)); // Petit délai
    
    const invoices = isPublic
      ? await this.getInvoicesPublic(projetId)
      : await this.getInvoices(projetId);

    return { tasks, milestones, invoices };
  }

  // Public update methods for client portal
  async updateTaskPublic(id: string, data: any) {
    return this.makeRequest(`/${this.config.tableIds.taches}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
  
  async updateInvoicePublic(id: string, data: any) {
    return this.makeRequest(`/${this.config.tableIds.factures}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
  
  async createClient(data: any) {
    const response = await this.makeRequest(`/${this.config.tableIds.clients}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    // Register ownership for the newly created client
    const spaceId = (response.Id || response.id)?.toString();
    if (spaceId) {
      await this.registerSpaceOwnership(spaceId);
    }
    
    return response;
  }

  async updateClient(id: string, data: any) {
    const res = await this.makeRequest(`/${this.config.tableIds.clients}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    // Invalidate related caches (single record and list)
    const singlePattern = `/${this.config.tableIds.clients}/${id}`;
    const listPattern = `/${this.config.tableIds.clients}`;
    NocoDBService.requestCache.forEach((_, key) => {
      if (key.includes(singlePattern) || key.endsWith(listPattern)) {
        NocoDBService.requestCache.delete(key);
      }
    });

    return res;
  }

  async deleteClient(id: string) {
    return this.makeRequest(`/${this.config.tableIds.clients}/${id}`, {
      method: 'DELETE',
    });
  }

  // Prospects - Filtered by user
  async getProspects(
    limit = 50,
    offset = 0,
    forceRefresh = false,
    options: { onlyCurrentUser?: boolean } = {}
  ) {
    const query = `/${this.config.tableIds.prospects}?limit=${limit}&offset=${offset}`;
    const response = await this.makeRequest(query, {}, 0, !forceRefresh);
    let list = response.list || [];

    // Filter by current user if requested
    if (options.onlyCurrentUser) {
      const currentUserId = await this.getCurrentUserId();
      if (currentUserId) {
        list = list.filter((prospect: any) => {
          const prospectUserId =
            prospect.user_id ||
            prospect.userId ||
            prospect.supabase_user_id ||
            prospect.owner_id;
          // Only show prospects explicitly assigned to the current user
          return prospectUserId === currentUserId;
        });
      }
    }

    return {
      ...response,
      list,
      pageInfo: { ...response.pageInfo, totalRows: list.length }
    };
  }

  async createProspect(data: any) {
    const payload = { ...data };
    const userId = await this.getCurrentUserId();
    if (userId) {
      (payload as any).supabase_user_id = userId;
    }
    const response = await this.makeRequest(`/${this.config.tableIds.prospects}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.invalidateCache(`/${this.config.tableIds.prospects}`);
    return response;
  }

  async updateProspect(id: string, data: any) {
    const response = await this.makeRequest(`/${this.config.tableIds.prospects}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    this.invalidateCache(`/${this.config.tableIds.prospects}`);
    return response;
  }

  async deleteProspect(id: string) {
    const response = await this.makeRequest(`/${this.config.tableIds.prospects}/${id}`, {
      method: 'DELETE',
    });
    this.invalidateCache(`/${this.config.tableIds.prospects}`);
    return response;
  }

  // Projets - Filtered by user's spaces
  async getProjets(clientId?: string) {
    const userSpaceIds = await this.getUserSpaceIds();

    const endpoint = clientId
      ? `/${this.config.tableIds.projets}?where=(client_id,eq,${clientId})`
      : `/${this.config.tableIds.projets}`;

    const response = await this.makeRequest(endpoint);

    if (clientId) {
      // If user has some space restrictions and doesn't own this one, return empty
      if (userSpaceIds.length > 0 && !userSpaceIds.includes(clientId)) {
        return { list: [], pageInfo: { totalRows: 0 } };
      }
      return response;
    }

    // If user has no registered spaces, return everything
    if (userSpaceIds.length === 0) {
      this.cachedProjectIds = (response.list || [])
        .map((p: any) => (p.Id || p.id)?.toString())
        .filter(Boolean);
      return response;
    }

    // Filter projects by user's owned clients
    const filteredList = (response.list || []).filter((projet: any) =>
      userSpaceIds.includes(projet.client_id?.toString())
    );

    this.cachedProjectIds = filteredList
      .map((p: any) => (p.Id || p.id)?.toString())
      .filter(Boolean);

    return {
      ...response,
      list: filteredList,
      pageInfo: { ...response.pageInfo, totalRows: filteredList.length }
    };
  }

  async createProjet(data: any) {
    const response = await this.makeRequest(`/${this.config.tableIds.projets}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.invalidateProjectCache();
    return response;
  }

  async updateProjet(id: string, data: any) {
    return this.makeRequest(`/${this.config.tableIds.projets}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProjet(id: string) {
    const response = await this.makeRequest(`/${this.config.tableIds.projets}/${id}`, {
      method: 'DELETE',
    });
    this.invalidateProjectCache();
    return response;
  }

  // Tâches - Filtered by user's projects
  async getTasks(
    projetId?: string,
    options: { onlyCurrentUser?: boolean } = {}
  ) {
    // Optionally filter by current Supabase user
    const currentUserId = options.onlyCurrentUser
      ? await this.getCurrentUserId()
      : null;

    // Récupère les projets accessibles à l'utilisateur
    const projetsResponse = await this.getProjets();
    const userProjectIds = (projetsResponse.list || [])
      .map((p: any) => (p.Id || p.id)?.toString())
      .filter(Boolean);

    const endpoint = projetId
      ? `/${this.config.tableIds.taches}?where=(projet_id,eq,${projetId})`
      : `/${this.config.tableIds.taches}`;

    const response = await this.makeRequest(endpoint);
    let list = response.list || [];

    if (projetId) {
      // Respect user project restrictions only if some are defined
      if (userProjectIds.length > 0 && !userProjectIds.includes(projetId)) {
        return { list: [], pageInfo: { totalRows: 0 } };
      }
    } else if (userProjectIds.length > 0) {
      // Filtrer les tâches par projets accessibles uniquement en mode global
      list = list.filter((task: any) =>
        userProjectIds.includes(task.projet_id?.toString())
      );
    }

    if (options.onlyCurrentUser && currentUserId) {
      list = list.filter((task: any) => {
        const taskUserId =
          task.user_id ||
          task.userId ||
          task.supabase_user_id ||
          task.owner_id;
        // Only show tasks explicitly assigned to the current user
        // or tasks that were created by the current user
        return taskUserId === currentUserId;
      });
    }

    return {
      ...response,
      list,
      pageInfo: { ...response.pageInfo, totalRows: list.length }
    };
  }

  async getTasksCount(
    projetId: string,
    options: { onlyCurrentUser?: boolean } = {},
  ) {
    if (!this.cachedProjectIds) {
      await this.getProjets();
    }

    const userProjectIds = this.cachedProjectIds || [];
    if (userProjectIds.length > 0 && !userProjectIds.includes(projetId)) {
      return 0;
    }

    const currentUserId = options.onlyCurrentUser
      ? await this.getCurrentUserId()
      : null;
    let where = `(projet_id,eq,${projetId})`;
    if (options.onlyCurrentUser && currentUserId) {
      where += `~and(supabase_user_id,eq,${currentUserId})`;
    }
    const endpoint = `/${this.config.tableIds.taches}?where=${where}&fields=Id&limit=1`;
    const response = await this.makeRequest(endpoint);
    return response.pageInfo?.totalRows ?? (response.list || []).length;
  }

  async createTask(data: any) {
    const payload = { ...data };
    const userId = await this.getCurrentUserId();
    if (userId) {
      (payload as any).supabase_user_id = userId;
    }
    const response = await this.makeRequest(`/${this.config.tableIds.taches}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.invalidateCache(`/${this.config.tableIds.taches}`);
    return response;
  }

  async updateTask(id: string, data: any) {
    const response = await this.makeRequest(`/${this.config.tableIds.taches}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    this.invalidateCache(`/${this.config.tableIds.taches}`);
    return response;
  }

  async deleteTask(id: string) {
    const response = await this.makeRequest(`/${this.config.tableIds.taches}/${id}`, {
      method: 'DELETE',
    });
    this.invalidateCache(`/${this.config.tableIds.taches}`);
    return response;
  }

  // Tâches internes
  async getInternalTasks(options: { onlyCurrentUser?: boolean } = {}) {
    const currentUserId = options.onlyCurrentUser
      ? await this.getCurrentUserId()
      : null;

    const response = await this.makeRequest(
      `/${this.config.tableIds.tachesInternes}`
    );
    let list = response.list || [];

    if (options.onlyCurrentUser && currentUserId) {
      list = list.filter((task: any) => {
        const taskUserId =
          task.user_id ||
          task.userId ||
          task.supabase_user_id ||
          task.owner_id;
        // Only show tasks explicitly assigned to the current user
        // or tasks that were created by the current user
        return taskUserId === currentUserId;
      });
    }

    list = list.map((t: any) => ({ ...t, isInternal: true }));

    return {
      ...response,
      list,
      pageInfo: { ...response.pageInfo, totalRows: list.length }
    };
  }

  async createInternalTask(data: any) {
    const payload = { ...data };
    const userId = await this.getCurrentUserId();
    if (userId) {
      (payload as any).supabase_user_id = userId;
    }
    const response = await this.makeRequest(`/${this.config.tableIds.tachesInternes}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.invalidateCache(`/${this.config.tableIds.tachesInternes}`);
    return response;
  }

  async updateInternalTask(id: string, data: any) {
    const response = await this.makeRequest(`/${this.config.tableIds.tachesInternes}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    this.invalidateCache(`/${this.config.tableIds.tachesInternes}`);
    return response;
  }

  async deleteInternalTask(id: string) {
    const response = await this.makeRequest(`/${this.config.tableIds.tachesInternes}/${id}`, {
      method: 'DELETE',
    });
    this.invalidateCache(`/${this.config.tableIds.tachesInternes}`);
    return response;
  }

  // Jalons - Filtered by user's spaces
  async getMilestones(projetId?: string, options: { fields?: string } = {}) {
    const userSpaceIds = await this.getUserSpaceIds();

    if (projetId && !userSpaceIds.includes(projetId)) {
      // User doesn't own this space, return empty
      return { list: [], pageInfo: { totalRows: 0 } };
    }

    const fieldsParam = options.fields ? `&fields=${options.fields}` : '';
    const endpoint = projetId
      ? `/${this.config.tableIds.jalons}?where=(projet_id,eq,${projetId})${fieldsParam}`
      : `/${this.config.tableIds.jalons}${fieldsParam ? `?${fieldsParam.slice(1)}` : ''}`;

    const response = await this.makeRequest(endpoint);

    if (!projetId) {
      // Filter milestones by user's owned spaces
      const filteredList = (response.list || []).filter((milestone: any) => 
        userSpaceIds.includes(milestone.projet_id?.toString())
      );
      return {
        ...response,
        list: filteredList,
        pageInfo: { ...response.pageInfo, totalRows: filteredList.length }
      };
    }

    return response;
  }

  async createMilestone(data: any) {
    return this.makeRequest(`/${this.config.tableIds.jalons}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMilestone(id: string, data: any) {
    return this.makeRequest(`/${this.config.tableIds.jalons}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteMilestone(id: string) {
    return this.makeRequest(`/${this.config.tableIds.jalons}/${id}`, {
      method: 'DELETE',
    });
  }

  // Factures - Filtered by user's spaces
  async getInvoices(projetId?: string) {
    const userSpaceIds = await this.getUserSpaceIds();
    
    if (projetId && !userSpaceIds.includes(projetId)) {
      // User doesn't own this space, return empty
      return { list: [], pageInfo: { totalRows: 0 } };
    }

    const endpoint = projetId 
      ? `/${this.config.tableIds.factures}?where=(projet_id,eq,${projetId})`
      : `/${this.config.tableIds.factures}`;
    
    const response = await this.makeRequest(endpoint);

    if (!projetId) {
      // Filter invoices by user's owned spaces
      const filteredList = (response.list || []).filter((invoice: any) => 
        userSpaceIds.includes(invoice.projet_id?.toString())
      );
      return {
        ...response,
        list: filteredList,
        pageInfo: { ...response.pageInfo, totalRows: filteredList.length }
      };
    }

    return response;
  }

  async getInvoicesCount(projetId: string) {
    const userSpaceIds = await this.getUserSpaceIds();
    if (userSpaceIds.length > 0 && !userSpaceIds.includes(projetId)) {
      return 0;
    }
    const endpoint = `/${this.config.tableIds.factures}?where=(projet_id,eq,${projetId})&fields=Id&limit=1`;
    const response = await this.makeRequest(endpoint);
    return response.pageInfo?.totalRows ?? (response.list || []).length;
  }

  async getProjectsWithStats(clientIds: string[]) {
    if (clientIds.length === 0) {
      return {};
    }

    const currentUserId = await this.getCurrentUserId();
    const ids = clientIds.join(',');

    const tasksWhere = `(projet_id,in,${ids})` + (currentUserId ? `~and(supabase_user_id,eq,${currentUserId})` : '');
    const milestonesWhere = `(projet_id,in,${ids})`;
    const invoicesWhere = `(projet_id,in,${ids})`;

    const [tasksRes, milestonesRes, invoicesRes] = await Promise.all([
      this.makeRequest(
        `/${this.config.tableIds.taches}?where=${tasksWhere}&fields=projet_id&limit=1000`
      ),
      this.makeRequest(
        `/${this.config.tableIds.jalons}?where=${milestonesWhere}&fields=projet_id,terminé,termine&limit=1000`
      ),
      this.makeRequest(
        `/${this.config.tableIds.factures}?where=${invoicesWhere}&fields=projet_id&limit=1000`
      )
    ]);

    const stats: Record<string, { tasksCount: number; milestonesCount: number; invoicesCount: number; doneMilestones: number }> = {};
    clientIds.forEach(id => {
      stats[id] = { tasksCount: 0, milestonesCount: 0, invoicesCount: 0, doneMilestones: 0 };
    });

    (tasksRes.list || []).forEach((task: any) => {
      const pid = task.projet_id?.toString();
      if (pid && stats[pid]) {
        stats[pid].tasksCount++;
      }
    });

    (milestonesRes.list || []).forEach((milestone: any) => {
      const pid = milestone.projet_id?.toString();
      if (pid && stats[pid]) {
        stats[pid].milestonesCount++;
        const status = milestone.terminé ?? milestone.termine;
        if (status === true || status === 'true') {
          stats[pid].doneMilestones++;
        }
      }
    });

    (invoicesRes.list || []).forEach((invoice: any) => {
      const pid = invoice.projet_id?.toString();
      if (pid && stats[pid]) {
        stats[pid].invoicesCount++;
      }
    });

    return stats;
  }

  async createInvoice(data: any) {
    return this.makeRequest(`/${this.config.tableIds.factures}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoice(id: string, data: any) {
    return this.makeRequest(`/${this.config.tableIds.factures}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteInvoice(id: string) {
    return this.makeRequest(`/${this.config.tableIds.factures}/${id}`, {
      method: 'DELETE',
    });
  }
}

export const nocodbService = new NocoDBService();
export default nocodbService;