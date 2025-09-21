import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client to verify JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the JWT token
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get secure credentials from environment
    const nocodbApiToken = Deno.env.get('NOCODB_API_TOKEN');
    const nocodbBaseUrl = Deno.env.get('NOCODB_BASE_URL');

    if (!nocodbApiToken || !nocodbBaseUrl) {
      console.error('Missing NocoDB credentials');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the request
    const { method, endpoint, data, params } = await req.json();

    // Construct the NocoDB URL
    let nocodbUrl = `${nocodbBaseUrl}${endpoint}`;
    if (params) {
      const urlParams = new URLSearchParams(params);
      nocodbUrl += `?${urlParams.toString()}`;
    }

    // Make the request to NocoDB
    const nocodbResponse = await fetch(nocodbUrl, {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'xc-token': nocodbApiToken,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    const responseData = await nocodbResponse.json();

    return new Response(
      JSON.stringify(responseData),
      {
        status: nocodbResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in nocodb-proxy:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});