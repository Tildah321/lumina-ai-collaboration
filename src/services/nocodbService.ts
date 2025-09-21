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
  private tableIds: {
    clients: string;
    projets: string;
    taches: string;
    jalons: string;
    factures: string;
    tachesInternes: string;
    prospects: string;
  };
  private cachedProjectIds: string[] | null = null;

  constructor() {
    this.config = {
      apiToken: 'c1e47e0c87eb68ed8b4b2b24b35b4e1e4e9c9fb5e5aed8d9b7db08e6a85fdd12',
      baseUrl: 'https://fmowxizbfmfrcyyomzew.nocodb.cloud/api/v2/tables',
      tableIds: {
        clients: 'mpd6txaj0t86ha7',
        projets: 'mpd6txaj0t86ha7',
        taches: 'mon8rt3orldc3nc',
        jalons: 'mkpfjd0kb9xvh17',
        factures: 'm6budmy04sawh66',
        tachesInternes: 'mz1vdjs96rg98gw',
        prospects: 'mjz7jie90f0ygw4'
      }
    };
    this.tableIds = this.config.tableIds;
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

    let spaceIds: string[] =
      (data?.map(item => item.space_id?.toString()) || []).filter(
        Boolean,
      ) as string[];

    // If none, infer from existing tasks owned by the user and persist mappings
    if (spaceIds.length === 0) {
      try {
        const ownedTasks = await this.makeRequest(
          `/${this.tableIds.taches}?where=(supabase_user_id,eq,${userId})&fields=projet_id&limit=1000`
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

  // Direct request method to NocoDB
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'xc-token': this.config.apiToken,
        ...options.headers,
      },
      body: options.body,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }


  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clients - Filtered by user
  async getClients(forceRefresh = false) {
    const userSpaceIds = await this.getUserSpaceIds();
    if (userSpaceIds.length === 0) {
      return { list: [], pageInfo: { totalRows: 0 } };
    }

    const response = await this.makeRequest(`/${this.tableIds.clients}`);
    
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

  async getClientById(id: string, forceRefresh = false) {
    const userSpaceIds = await this.getUserSpaceIds();
    if (!userSpaceIds.includes(id)) {
      return null;
    }

    return this.makeRequest(`/${this.tableIds.clients}/${id}`);
  }

  async getClientByIdPublic(id: string, forceRefresh = false) {
    return this.makeRequest(`/${this.tableIds.clients}/${id}`);
  }

  async createClient(data: any) {
    const response = await this.makeRequest(`/${this.tableIds.clients}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    const spaceId = (response.Id || response.id)?.toString();
    if (spaceId) {
      await this.registerSpaceOwnership(spaceId);
    }
    
    return response;
  }

  async updateClient(id: string, data: any) {
    return this.makeRequest(`/${this.tableIds.clients}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string) {
    return this.makeRequest(`/${this.tableIds.clients}/${id}`, {
      method: 'DELETE',
    });
  }

  // Public endpoints for client-portal (no Supabase ownership filtering)
  async getTasksPublic(projetId: string) {
    return this.makeRequest(`/${this.tableIds.taches}?where=(projet_id,eq,${projetId})`);
  }

  async getMilestonesPublic(projetId: string) {
    return this.makeRequest(`/${this.tableIds.jalons}?where=(projet_id,eq,${projetId})`);
  }

  async getInvoicesPublic(projetId: string) {
    return this.makeRequest(`/${this.tableIds.factures}?where=(projet_id,eq,${projetId})`);
  }

  async getSpaceData(projetId: string, isPublic = false, options: { onlyCurrentUser?: boolean } = {}) {
    const fetchAll = () => {
      if (isPublic) {
        return Promise.all([
          this.getTasksPublic(projetId).catch(() => ({ list: [], pageInfo: { totalRows: 0 } })),
          this.getMilestonesPublic(projetId).catch(() => ({ list: [], pageInfo: { totalRows: 0 } })),
          this.getInvoicesPublic(projetId).catch(() => ({ list: [], pageInfo: { totalRows: 0 } })),
        ]);
      }

      return Promise.all([
        this.getTasks(projetId, options).catch(() => ({ list: [], pageInfo: { totalRows: 0 } })),
        this.getMilestones(projetId).catch(() => ({ list: [], pageInfo: { totalRows: 0 } })),
        this.getInvoices(projetId).catch(() => ({ list: [], pageInfo: { totalRows: 0 } })),
      ]);
    };

    await this.delay(100);
    const [tasks, milestones, invoices] = await fetchAll();

    return { tasks, milestones, invoices, errors: [] };
  }

  async updateTaskPublic(id: string, data: any) {
    return this.makeRequest(`/${this.tableIds.taches}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
  
  async updateInvoicePublic(id: string, data: any) {
    return this.makeRequest(`/${this.tableIds.factures}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Prospects
  async getProspects(limit = 50, offset = 0, forceRefresh = false, options: { onlyCurrentUser?: boolean } = {}) {
    const query = `/${this.tableIds.prospects}?limit=${limit}&offset=${offset}`;
    const response = await this.makeRequest(query);
    let list = response.list || [];

    if (options.onlyCurrentUser) {
      const currentUserId = await this.getCurrentUserId();
      if (currentUserId) {
        list = list.filter((prospect: any) => {
          const prospectUserId = prospect.supabase_user_id || prospect.user_id || prospect.owner_id;
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
      throw new Error('Missing user ID');
    }
    const payload = { ...data };
    (payload as any).supabase_user_id = userId;
    return this.makeRequest(`/${this.tableIds.prospects}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateProspect(id: string, data: any) {
    return this.makeRequest(`/${this.tableIds.prospects}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProspect(id: string) {
    return this.makeRequest(`/${this.tableIds.prospects}/${id}`, {
      method: 'DELETE',
    });
  }

  // Tasks
  async getTasks(projetId?: string, options: { onlyCurrentUser?: boolean } = {}) {
    const endpoint = projetId 
      ? `/${this.tableIds.taches}?where=(projet_id,eq,${projetId})`
      : `/${this.tableIds.taches}`;
    
    const response = await this.makeRequest(endpoint);
    
    if (options.onlyCurrentUser && !projetId) {
      const currentUserId = await this.getCurrentUserId();
      if (currentUserId) {
        const filteredList = (response.list || []).filter((task: any) => {
          return task.supabase_user_id === currentUserId;
        });
        return {
          ...response,
          list: filteredList,
          pageInfo: { ...response.pageInfo, totalRows: filteredList.length }
        };
      }
    }

    return response;
  }

  async createTask(data: any) {
    return this.makeRequest(`/${this.tableIds.taches}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: any) {
    return this.makeRequest(`/${this.tableIds.taches}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string) {
    return this.makeRequest(`/${this.tableIds.taches}/${id}`, {
      method: 'DELETE',
    });
  }

  // Milestones
  async getMilestones(projetId?: string, fields?: string[]) {
    const fieldsParam = fields ? `&fields=${fields.join(',')}` : '';
    const endpoint = projetId
      ? `/${this.tableIds.jalons}?where=(projet_id,eq,${projetId})${fieldsParam}`
      : `/${this.tableIds.jalons}${fieldsParam ? `?${fieldsParam.slice(1)}` : ''}`;

    return this.makeRequest(endpoint);
  }

  async createMilestone(data: any) {
    return this.makeRequest(`/${this.tableIds.jalons}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMilestone(id: string, data: any) {
    return this.makeRequest(`/${this.tableIds.jalons}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteMilestone(id: string) {
    return this.makeRequest(`/${this.tableIds.jalons}/${id}`, {
      method: 'DELETE',
    });
  }

  // Invoices
  async getInvoices(projetId?: string) {
    const endpoint = projetId
      ? `/${this.tableIds.factures}?where=(projet_id,eq,${projetId})`
      : `/${this.tableIds.factures}`;

    return this.makeRequest(endpoint);
  }

  async createInvoice(data: any) {
    return this.makeRequest(`/${this.tableIds.factures}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoice(id: string, data: any) {
    return this.makeRequest(`/${this.tableIds.factures}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteInvoice(id: string) {
    return this.makeRequest(`/${this.tableIds.factures}/${id}`, {
      method: 'DELETE',
    });
  }

  // Projects (using same table as clients)
  async getProjets(clientId?: string, forceRefresh = false) {
    const userSpaceIds = await this.getUserSpaceIds();
    if (userSpaceIds.length === 0) {
      return { list: [], pageInfo: { totalRows: 0 } };
    }

    const endpoint = clientId 
      ? `/${this.tableIds.projets}?where=(client_id,eq,${clientId})`
      : `/${this.tableIds.projets}`;
    
    const response = await this.makeRequest(endpoint);
    
    const filteredList = (response.list || []).filter((projet: any) => {
      const projetId = (projet.Id || projet.id)?.toString();
      return userSpaceIds.includes(projetId);
    });

    return {
      ...response,
      list: filteredList,
      pageInfo: { ...response.pageInfo, totalRows: filteredList.length }
    };
  }

  async createProjet(data: any) {
    const response = await this.makeRequest(`/${this.tableIds.projets}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    const spaceId = (response.Id || response.id)?.toString();
    if (spaceId) {
      await this.registerSpaceOwnership(spaceId);
    }
    
    return response;
  }

  async updateProjet(id: string, data: any) {
    return this.makeRequest(`/${this.tableIds.projets}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProjet(id: string) {
    return this.makeRequest(`/${this.tableIds.projets}/${id}`, {
      method: 'DELETE',
    });
  }

  // Internal Tasks
  async getInternalTasks(forceRefresh = false) {
    return this.makeRequest(`/${this.tableIds.tachesInternes}`);
  }

  async createInternalTask(data: any) {
    return this.makeRequest(`/${this.tableIds.tachesInternes}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInternalTask(id: string, data: any) {
    return this.makeRequest(`/${this.tableIds.tachesInternes}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteInternalTask(id: string) {
    return this.makeRequest(`/${this.tableIds.tachesInternes}/${id}`, {
      method: 'DELETE',
    });
  }

  // Stats methods (simplified)
  async getProspectStats() {
    const prospects = await this.makeRequest(`/${this.tableIds.prospects}?limit=1000`);
    return { list: prospects.list || [], pageInfo: prospects.pageInfo || { totalRows: 0 } };
  }

  async getTaskStats() {
    const tasks = await this.makeRequest(`/${this.tableIds.taches}?limit=1000`);
    return { list: tasks.list || [], pageInfo: tasks.pageInfo || { totalRows: 0 } };
  }

  async getInternalTaskStats() {
    const tasks = await this.makeRequest(`/${this.tableIds.tachesInternes}?limit=1000`);
    return { list: tasks.list || [], pageInfo: tasks.pageInfo || { totalRows: 0 } };
  }
}

export const nocodbService = new NocoDBService();
export default nocodbService;