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
        .select('id, webhook_type')
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
        JSON.stringify({ success: true, message: 'Webhook endpoint is valid', type: webhookConfig.webhook_type }),
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

    // Verify secret token only if webhook requires it AND token is provided in request
    if (webhookConfig.secret_token) {
      if (secret_token && webhookConfig.secret_token !== secret_token) {
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
      // If webhook has a secret but none provided, allow it (for services like Fillout that don't send custom headers)
      console.log('Webhook has secret_token configured, but allowing request without verification for external services');
    }

    // Handle based on webhook type
    if (webhookConfig.webhook_type === 'create_client') {
      console.log('Creating client space from webhook data');
      
      // Extract client data from webhook payload
      const clientName = data.name || data.client_name || data.formName || title;
      const clientEmail = data.email || data.client_email || '';
      const clientDescription = data.description || message || '';
      const driveLink = data.drive_link || data.google_drive || '';
      const paymentAmount = data.payment_amount || data.amount || '';
      const paymentLink = data.payment_link || '';
      const messageLink = data.message_link || '';
      const meetingLink = data.meeting_link || '';
      
      if (!clientName) {
        console.error('Missing client name in payload');
        return new Response(
          JSON.stringify({ 
            error: 'Client name is required. Provide it in "name", "client_name", or "formName" field.' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Call NocoDB API to create client space
      const nocoDBUrl = Deno.env.get('NOCODB_BASE_URL');
      const nocoDBToken = Deno.env.get('NOCODB_API_TOKEN');
      
      if (!nocoDBUrl || !nocoDBToken) {
        console.error('NocoDB configuration missing');
        return new Response(
          JSON.stringify({ 
            error: 'Server configuration error: NocoDB not configured' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      try {
        const nocoDBResponse = await fetch(`${nocoDBUrl}/api/v2/tables/m1xo1p3o54rxqze/records`, {
          method: 'POST',
          headers: {
            'xc-token': nocoDBToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: clientEmail,
            statut: 'actif',
            description: clientDescription,
            lien_drive: driveLink,
            montant_paiement: paymentAmount,
            lien_paiement: paymentLink,
            lien_message: messageLink,
            lien_meeting: meetingLink,
            user_id: webhookConfig.user_id
          })
        });

        if (!nocoDBResponse.ok) {
          const errorText = await nocoDBResponse.text();
          console.error('NocoDB API error:', errorText);
          throw new Error(`NocoDB API error: ${errorText}`);
        }

        const clientSpace = await nocoDBResponse.json();
        console.log('Client space created successfully:', clientSpace);

        // Also create a notification about the new client space
        const { error: notificationError } = await supabaseClient
          .from('notifications')
          .insert({
            user_id: webhookConfig.user_id,
            webhook_id: webhookConfig.id,
            title: `Nouvel espace client créé: ${clientName}`,
            message: `Un nouvel espace client a été créé automatiquement via webhook`,
            data: { client_name: clientName, client_id: clientSpace.Id, webhook_data: data },
            read: false
          });

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Client space created successfully',
            client_id: clientSpace.Id,
            client_name: clientName
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } catch (error) {
        console.error('Error creating client space:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create client space',
            details: error.message
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Default behavior: create notification
    console.log('Creating notification from webhook');
    
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