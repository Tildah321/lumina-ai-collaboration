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

    // 1) Read existing mappings
    const { data, error } = await supabase
      .from('noco_space_owners')
      .select('space_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user spaces:', error);
      return [];
    }

    let spaceIds: string[] =
      (data?.map(item => item.space_id?.toString()) || []).filter(
        Boolean,
      ) as string[];

    // 2) If none, infer from existing tasks owned by the user and persist mappings
    if (spaceIds.length === 0) {
      try {
        const ownedTasks = await this.makeRequest(
          `/${this.config.tableIds.taches}?where=(supabase_user_id,eq,${userId})&fields=projet_id&limit=1000`
        );
        const inferredIds: string[] = Array.from(
          new Set(
            (ownedTasks.list || [])
              .map((t: any) => t.projet_id?.toString())
              .filter((id: any) => !!id)
          )
        );

        if (inferredIds.length > 0) {
          // Persist inferred ownership
          await Promise.all(inferredIds.map(id => this.registerSpaceOwnership(id)));
          // Re-read mappings
          const recheck = await supabase
            .from('noco_space_owners')
            .select('space_id')
            .eq('user_id', userId);
          if (!recheck.error) {
            spaceIds = (recheck.data || [])
              .map(r => r.space_id?.toString())
              .filter(Boolean) as string[];
          }
        }
      } catch (e) {
        console.warn('Could not infer user spaces from tasks:', e);
      }
    }

    return spaceIds;
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
  private static readonly CACHE_DURATION = 60000; // 1 minute pour limiter la latence des données
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

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async updateInBatches<T>(items: T[], batchSize: number, updater: (item: T) => Promise<any>) {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(updater));
      // Petit délai pour éviter le rate limit NocoDB gratuit
      await this.delay(400);
    }
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

  private async fetchAllRecords(endpoint: string) {
    const limit = 1000;
    let offset = 0;
    let allItems: any[] = [];
    let pageInfo: any = {};

    while (true) {
      const separator = endpoint.includes('?') ? '&' : '?';
      const res = await this.makeRequest(`${endpoint}${separator}limit=${limit}&offset=${offset}`);
      const list = res.list || [];
      allItems = allItems.concat(list);
      pageInfo = res.pageInfo || pageInfo;

      if (!res.pageInfo || list.length < limit || allItems.length >= (res.pageInfo.totalRows || 0)) {
        break;
      }
      offset += limit;
    }

    return { list: allItems, pageInfo: { ...pageInfo, totalRows: allItems.length } };
  }

  // Public endpoints for client-portal (no Supabase ownership filtering)
  async getTasksPublic(projetId: string) {
    return this.fetchAllRecords(`/${this.config.tableIds.taches}?where=(projet_id,eq,${projetId})`);
  }

  async getMilestonesPublic(projetId: string) {
    return this.fetchAllRecords(`/${this.config.tableIds.jalons}?where=(projet_id,eq,${projetId})`);
  }

  async getInvoicesPublic(projetId: string) {
    return this.fetchAllRecords(`/${this.config.tableIds.factures}?where=(projet_id,eq,${projetId})`);
  }

  // Chargement en parallèle avec gestion du rate limit NocoDB
  async getSpaceData(
    projetId: string,
    isPublic = false,
    options: { onlyCurrentUser?: boolean } = {},
  ) {
    const fetchAll = () => {
      if (isPublic) {
        return Promise.all([
          this.getTasksPublic(projetId).catch(error => ({ error })),
          this.getMilestonesPublic(projetId).catch(error => ({ error })),
          this.getInvoicesPublic(projetId).catch(error => ({ error })),
        ]);
      }

      return Promise.all([
        this.getTasks(projetId, options).catch(error => ({ error })),
        this.getMilestones(projetId).catch(error => ({ error })),
        this.getInvoices(projetId).catch(error => ({ error })),
      ]);
    };

    // légère temporisation globale
    await this.delay(100);
    let [tasks, milestones, invoices] = await fetchAll();

    const isRateLimit = (res: any) =>
      res?.error && typeof res.error.message === 'string' && res.error.message.includes('Too many requests');

    if (isRateLimit(tasks) || isRateLimit(milestones) || isRateLimit(invoices)) {
      await this.delay(500);
      [tasks, milestones, invoices] = await fetchAll();
    }

    const errors: string[] = [];
    if ((tasks as any).error) {
      errors.push('tasks');
      tasks = { list: [], pageInfo: { totalRows: 0 } } as any;
    }
    if ((milestones as any).error) {
      errors.push('milestones');
      milestones = { list: [], pageInfo: { totalRows: 0 } } as any;
    }
    if ((invoices as any).error) {
      errors.push('invoices');
      invoices = { list: [], pageInfo: { totalRows: 0 } } as any;
    }

    return { tasks, milestones, invoices, errors };
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
            prospect.supabase_user_id ||
            prospect.user_id ||
            prospect.owner_id;
          return prospectUserId === currentUserId;
        });
      } else {
        list = [];
      }
    }

    return {
      ...response,
      list,
      pageInfo: { ...response.pageInfo, totalRows: list.length }
    };
  }

  async createProspect(data: any) {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      console.warn('User ID required to create prospect');
      throw new Error('Missing user ID');
    }
    const payload = { ...data };
    (payload as any).supabase_user_id = userId;
    (payload as any).c06e1av5n7l80 = userId;
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

    const clientIdStr = clientId?.toString();
    const endpoint = clientIdStr
      ? `/${this.config.tableIds.projets}?where=(client_id,eq,${clientIdStr})`
      : `/${this.config.tableIds.projets}`;

    const response = await this.fetchAllRecords(endpoint);

    if (clientIdStr) {
      // If user has some space restrictions and doesn't own this one, return empty
      if (userSpaceIds.length > 0 && !userSpaceIds.includes(clientIdStr)) {
        return { list: [], pageInfo: { totalRows: 0 } };
      }
      return response;
    }

    // If user has no registered spaces, return empty to avoid data leak
    if (userSpaceIds.length === 0) {
      this.cachedProjectIds = [];
      return { list: [], pageInfo: { totalRows: 0 } };
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

    // Récupère les projets accessibles à l'utilisateur en utilisant le cache si disponible
    let userProjectIds: string[] = [];
    if (this.cachedProjectIds !== null) {
      userProjectIds = this.cachedProjectIds;
    } else {
      const projetsResponse = await this.getProjets();
      userProjectIds = (projetsResponse.list || [])
        .map((p: any) => (p.Id || p.id)?.toString())
        .filter(Boolean);
    }

    // If user has no accessible projects and no specific project requested,
    // return empty only when not filtering for the current user
    if (!projetId && userProjectIds.length === 0 && !options.onlyCurrentUser) {
      return { list: [], pageInfo: { totalRows: 0 } };
    }

    const projetIdStr = projetId?.toString();
    const endpoint = projetIdStr
      ? `/${this.config.tableIds.taches}?where=(projet_id,eq,${projetIdStr})`
      : `/${this.config.tableIds.taches}`;

    const response = await this.fetchAllRecords(endpoint);
    let list = response.list || [];

    if (projetIdStr) {
      // Respect user project restrictions only if some are defined
      if (userProjectIds.length > 0 && !userProjectIds.includes(projetIdStr)) {
        return { list: [], pageInfo: { totalRows: 0 } };
      }
    } else if (userProjectIds.length > 0) {
      // Filtrer les tâches par projets accessibles uniquement en mode global
      list = list.filter((task: any) =>
        userProjectIds.includes(task.projet_id?.toString())
      );
    }

    if (options.onlyCurrentUser) {
      if (currentUserId) {
        list = list.filter((task: any) => {
          const taskUserId =
            task.supabase_user_id ||
            task.user_id ||
            task.owner_id;
          return taskUserId === currentUserId;
        });
      } else {
        // No authenticated user => no tasks exposed
        list = [];
      }
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
    const response = await this.fetchAllRecords(endpoint);
    return response.pageInfo?.totalRows ?? (response.list || []).length;
  }

  async createTask(data: any) {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      console.warn('User ID required to create task');
      throw new Error('Missing user ID');
    }
    const payload = { ...data };
    (payload as any).supabase_user_id = userId;
    (payload as any).c3bte4bwnnls4h = userId;
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
  async getInternalTasks(forceRefresh = false, options: { onlyCurrentUser?: boolean } = {}) {
    const currentUserId = options.onlyCurrentUser
      ? await this.getCurrentUserId()
      : null;

    const response = await this.makeRequest(
      `/${this.config.tableIds.tachesInternes}`,
      {},
      0,
      !forceRefresh
    );
    let list = response.list || [];

    if (options.onlyCurrentUser) {
      if (currentUserId) {
        list = list.filter((task: any) => {
          const taskUserId =
            task.supabase_user_id ||
            task.user_id ||
            task.owner_id;
          return taskUserId === currentUserId;
        });
      } else {
        list = [];
      }
    }

    list = list.map((t: any) => ({ ...t, isInternal: true }));

    return {
      ...response,
      list,
      pageInfo: { ...response.pageInfo, totalRows: list.length }
    };
  }

  async createInternalTask(data: any) {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      console.warn('User ID required to create internal task');
      throw new Error('Missing user ID');
    }
    const payload = { ...data };
    (payload as any).supabase_user_id = userId;
    (payload as any).c3bte4bwnnls4h = userId;
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

  // Backfill: attribuer les anciens prospects au compte courant
  async backfillProspectsForCurrentUser() {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      return { updatedProspects: 0 };
    }

    const prospectsRes = await this.makeRequest(`/${this.config.tableIds.prospects}?limit=1000`);
    const prospects = prospectsRes.list || [];

    const toUpdate = prospects.filter((p: any) => {
      const owner = p.supabase_user_id || p.user_id || p.userId || p.owner_id;
      if (owner) return false;
      const resp = (
        p.responsable || p.responsible || ''
      )
        .toString()
        .trim()
        .toLowerCase();
      return resp === 'moi' || resp === 'nous';
    });

    await this.updateInBatches(toUpdate, 10, async (p: any) => {
      const id = (p.Id || p.id)?.toString();
      if (!id) return;
      await this.updateProspect(id, { supabase_user_id: userId, c06e1av5n7l80: userId });
    });

    return { updatedProspects: toUpdate.length };
  }

  // Backfill: attribuer les anciennes tâches au compte courant et mapper les espaces
  async backfillTasksForCurrentUser() {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      return { updatedClientTasks: 0, updatedInternalTasks: 0, mappedSpaces: 0 };
    }

    // 1) Tâches client
    const clientTasksRes = await this.makeRequest(`/${this.config.tableIds.taches}?limit=1000`);
    const clientTasks = (clientTasksRes.list || []);

    const toUpdateClient = clientTasks.filter((t: any) => {
      const owner = t.supabase_user_id || t.user_id || t.userId || t.owner_id;
      if (owner) return false;
      const resp = (
        t.assigne_a || t['assigné_a'] || t.responsable || t.responsible || ''
      )
        .toString()
        .trim()
        .toLowerCase();
      // Considérer seulement les tâches marquées pour l'utilisateur (moi/nous)
      return resp === 'moi' || resp === 'nous';
    });

    const mappedSpaceIds = new Set<string>();
    await this.updateInBatches(toUpdateClient, 10, async (t: any) => {
      const id = (t.Id || t.id)?.toString();
      if (!id) return;
      await this.updateTask(id, { supabase_user_id: userId });
      const pid = t.projet_id?.toString();
      if (pid) {
        mappedSpaceIds.add(pid);
        await this.registerSpaceOwnership(pid);
      }
    });

    // 2) Tâches internes
    const internalTasksRes = await this.makeRequest(`/${this.config.tableIds.tachesInternes}?limit=1000`);
    const internalTasks = (internalTasksRes.list || []);

    const toUpdateInternal = internalTasks.filter((t: any) => {
      const owner = t.supabase_user_id || t.user_id || t.userId || t.owner_id;
      if (owner) return false;
      const resp = (
        t.assigne_a || t['assigné_a'] || t.responsable || t.responsible || ''
      )
        .toString()
        .trim()
        .toLowerCase();
      return resp === 'moi' || resp === 'nous';
    });

    await this.updateInBatches(toUpdateInternal, 10, async (t: any) => {
      const id = (t.Id || t.id)?.toString();
      if (!id) return;
      await this.updateInternalTask(id, { supabase_user_id: userId });
    });

    return {
      updatedClientTasks: toUpdateClient.length,
      updatedInternalTasks: toUpdateInternal.length,
      mappedSpaces: mappedSpaceIds.size,
    };
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

    const response = await this.fetchAllRecords(endpoint);

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

    const response = await this.fetchAllRecords(endpoint);

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