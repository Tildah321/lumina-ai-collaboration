import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NocoDBConfig {
  apiToken: string;
  baseUrl: string;
  tableIds: {
    clients: string;
    taches: string;
    jalons: string;
    factures: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { spaceId } = await req.json()

    if (!spaceId) {
      return new Response(
        JSON.stringify({ error: 'spaceId is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🗑️ Starting cascade deletion for space: ${spaceId}`)

    // Configuration NocoDB
    const config: NocoDBConfig = {
      apiToken: Deno.env.get('NOCODB_API_TOKEN') ?? '',
      baseUrl: Deno.env.get('NOCODB_BASE_URL') ?? '',
      tableIds: {
        clients: 'mpd6txaj0t86ha7',
        taches: 'mon8rt3orldc3nc',
        jalons: 'mkpfjd0kb9xvh17',
        factures: 'm6budmy04sawh66'
      }
    }

    // Fonction helper pour faire des requêtes NocoDB
    const makeNocoRequest = async (endpoint: string, options: RequestInit = {}) => {
      const url = `${config.baseUrl}${endpoint}`
      const response = await fetch(url, {
        ...options,
        headers: {
          'xc-token': config.apiToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ NocoDB Error for ${endpoint}:`, errorText)
        throw new Error(`NocoDB API Error: ${response.status} ${response.statusText}`)
      }

      return response.json()
    }

    // 1. Supprimer toutes les tâches liées à l'espace
    console.log(`📋 Deleting tasks for space ${spaceId}`)
    try {
      const tasksResponse = await makeNocoRequest(
        `/${config.tableIds.taches}?where=(projet_id,eq,${spaceId})`
      )
      
      const tasks = tasksResponse.list || []
      console.log(`Found ${tasks.length} tasks to delete`)
      
      for (const task of tasks) {
        await makeNocoRequest(`/${config.tableIds.taches}/${task.Id}`, {
          method: 'DELETE'
        })
        console.log(`✅ Deleted task ${task.Id}`)
      }
    } catch (error) {
      console.error('Error deleting tasks:', error)
    }

    // 2. Supprimer tous les jalons liés à l'espace
    console.log(`🎯 Deleting milestones for space ${spaceId}`)
    try {
      const milestonesResponse = await makeNocoRequest(
        `/${config.tableIds.jalons}?where=(projet_id,eq,${spaceId})`
      )
      
      const milestones = milestonesResponse.list || []
      console.log(`Found ${milestones.length} milestones to delete`)
      
      for (const milestone of milestones) {
        await makeNocoRequest(`/${config.tableIds.jalons}/${milestone.Id}`, {
          method: 'DELETE'
        })
        console.log(`✅ Deleted milestone ${milestone.Id}`)
      }
    } catch (error) {
      console.error('Error deleting milestones:', error)
    }

    // 3. Supprimer toutes les factures liées à l'espace
    console.log(`💰 Deleting invoices for space ${spaceId}`)
    try {
      const invoicesResponse = await makeNocoRequest(
        `/${config.tableIds.factures}?where=(projet_id,eq,${spaceId})`
      )
      
      const invoices = invoicesResponse.list || []
      console.log(`Found ${invoices.length} invoices to delete`)
      
      for (const invoice of invoices) {
        await makeNocoRequest(`/${config.tableIds.factures}/${invoice.Id}`, {
          method: 'DELETE'
        })
        console.log(`✅ Deleted invoice ${invoice.Id}`)
      }
    } catch (error) {
      console.error('Error deleting invoices:', error)
    }

    // 4. Supprimer les accès collaborateurs dans Supabase
    console.log(`👥 Deleting collaborator access for space ${spaceId}`)
    try {
      const { error: collaboratorError } = await supabase
        .from('space_collaborators')
        .delete()
        .eq('space_id', spaceId)

      if (collaboratorError) {
        console.error('Error deleting collaborator access:', collaboratorError)
      } else {
        console.log('✅ Deleted collaborator access')
      }
    } catch (error) {
      console.error('Error deleting collaborator access:', error)
    }

    // 5. Supprimer les mappings de propriété dans Supabase
    console.log(`🔗 Deleting space ownership mappings for space ${spaceId}`)
    try {
      const { error: ownershipError } = await supabase
        .from('noco_space_owners')
        .delete()
        .eq('space_id', spaceId)

      if (ownershipError) {
        console.error('Error deleting ownership mappings:', ownershipError)
      } else {
        console.log('✅ Deleted ownership mappings')
      }
    } catch (error) {
      console.error('Error deleting ownership mappings:', error)
    }

    // 6. Enfin, supprimer l'espace client lui-même
    console.log(`🏢 Deleting client space ${spaceId}`)
    try {
      await makeNocoRequest(`/${config.tableIds.clients}/${spaceId}`, {
        method: 'DELETE'
      })
      console.log('✅ Deleted client space')
    } catch (error) {
      console.error('Error deleting client space:', error)
      throw error
    }

    console.log(`🎉 Successfully completed cascade deletion for space ${spaceId}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Space and all related data deleted successfully' 
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error in delete-space-cascade:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to delete space cascade', 
        details: (error as Error).message 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})