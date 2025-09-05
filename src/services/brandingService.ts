import { supabase } from '@/integrations/supabase/client';

export interface UserBranding {
  company_name?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  logo_url?: string | null;
}

class BrandingService {
  private async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  }

  async getBranding(): Promise<UserBranding | null> {
    const userId = await this.getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('user_branding')
      .select('company_name, primary_color, secondary_color, logo_url')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching branding:', error);
      return null;
    }

    return data as UserBranding;
  }

  async upsertBranding(branding: UserBranding): Promise<UserBranding | null> {
    const userId = await this.getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('user_branding')
      .upsert({ user_id: userId, ...branding })
      .select('company_name, primary_color, secondary_color, logo_url')
      .single();

    if (error) {
      console.error('Error updating branding:', error);
      return null;
    }

    return data as UserBranding;
  }
}

export const brandingService = new BrandingService();
export default brandingService;
