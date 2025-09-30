import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  endpoint_key: string;
  secret_token?: string;
  title: string;
  message?: string;
  data?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Webhook receiver called');

    // Parse the request body
    const body: WebhookPayload = await req.json();
    console.log('Received webhook payload:', body);

    const { endpoint_key, secret_token, title, message, data } = body;

    if (!endpoint_key || !title) {
      console.error('Missing required fields: endpoint_key or title');
      return new Response(
        JSON.stringify({ 
          error: 'endpoint_key and title are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Find the webhook configuration
    const { data: webhookConfig, error: webhookError } = await supabaseClient
      .from('webhooks')
      .select('*')
      .eq('endpoint_key', endpoint_key)
      .eq('is_active', true)
      .single();

    if (webhookError || !webhookConfig) {
      console.error('Webhook not found or inactive:', webhookError);
      return new Response(
        JSON.stringify({ 
          error: 'Webhook endpoint not found or inactive' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify secret token if provided
    if (webhookConfig.secret_token && webhookConfig.secret_token !== secret_token) {
      console.error('Invalid secret token');
      return new Response(
        JSON.stringify({ 
          error: 'Invalid secret token' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create notification
    const { data: notification, error: notificationError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: webhookConfig.user_id,
        webhook_id: webhookConfig.id,
        title,
        message,
        data,
        read: false
      })
      .select()
      .single();

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create notification' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Notification created successfully:', notification);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification_id: notification.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});