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
    
    // Extract endpoint_key from URL query params
    const url = new URL(req.url);
    const endpoint_key = url.searchParams.get('endpoint_key');

    // Handle GET requests (for webhook validation)
    if (req.method === 'GET') {
      if (!endpoint_key) {
        return new Response(
          JSON.stringify({ error: 'endpoint_key query parameter is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Verify the webhook exists and is active
      const { data: webhookConfig, error } = await supabaseClient
        .from('webhooks')
        .select('id')
        .eq('endpoint_key', endpoint_key)
        .eq('is_active', true)
        .single();

      if (error || !webhookConfig) {
        return new Response(
          JSON.stringify({ error: 'Webhook not found or inactive' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Webhook endpoint is valid' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the request body for POST requests
    const body = await req.json();
    console.log('Received webhook payload:', body);

    // Extract data from different webhook formats
    let title: string;
    let message: string | undefined;
    let data: any;
    let secret_token: string | undefined;

    // Check if this is a Fillout webhook
    if (body.formName || body.formId) {
      title = body.formName || 'Nouveau formulaire';
      message = `Nouvelle soumission du formulaire ${body.formId}`;
      data = body;
    } else {
      // Standard webhook format
      title = body.title;
      message = body.message;
      data = body.data;
      secret_token = body.secret_token;
    }

    if (!endpoint_key) {
      console.error('Missing endpoint_key in URL');
      return new Response(
        JSON.stringify({ 
          error: 'endpoint_key query parameter is required. URL format: /webhook-receiver?endpoint_key=YOUR_KEY' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!title) {
      console.error('Missing title in payload');
      return new Response(
        JSON.stringify({ 
          error: 'title is required in the payload' 
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