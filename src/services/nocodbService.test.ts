import { describe, it, expect, vi, afterEach } from 'vitest';
import nocodbService from './nocodbService';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NocoDBService filtering', () => {
  it('filters internal tasks on server when onlyCurrentUser is true', async () => {
    const service = nocodbService as any;
    vi.spyOn(service, 'getCurrentUserId').mockResolvedValue('user123');
    const makeRequestSpy = vi
      .spyOn(service, 'makeRequest')
      .mockResolvedValue({ list: [], pageInfo: {} });

    await service.getInternalTasks({ onlyCurrentUser: true });
    const expectedEndpoint = `/${service.config.tableIds.tachesInternes}?where=(supabase_user_id,eq,user123)`;
    expect(makeRequestSpy).toHaveBeenCalledWith(expectedEndpoint);
  });

  it('filters prospects on server when onlyCurrentUser is true', async () => {
    const service = nocodbService as any;
    vi.spyOn(service, 'getCurrentUserId').mockResolvedValue('user123');
    const makeRequestSpy = vi
      .spyOn(service, 'makeRequest')
      .mockResolvedValue({ list: [], pageInfo: {} });

    await service.getProspects(50, 0, false, { onlyCurrentUser: true });
    const expectedEndpoint = `/${service.config.tableIds.prospects}?limit=50&offset=0&where=(supabase_user_id,eq,user123)`;
    expect(makeRequestSpy).toHaveBeenCalledWith(expectedEndpoint, {}, 0, true);
  });
});
