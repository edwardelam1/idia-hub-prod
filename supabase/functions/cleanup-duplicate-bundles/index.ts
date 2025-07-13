import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting duplicate bundle cleanup...')

    // Find duplicate bundles (same title and category)
    const { data: allBundles, error: fetchError } = await supabaseClient
      .from('marketplace_bundles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching bundles:', fetchError)
      throw fetchError
    }

    if (!allBundles || allBundles.length === 0) {
      return new Response(JSON.stringify({
        message: 'No bundles found to process',
        duplicatesRemoved: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Group bundles by title and category to find duplicates
    const bundleGroups: { [key: string]: any[] } = {}
    
    allBundles.forEach(bundle => {
      const key = `${bundle.title}|${bundle.category}`
      if (!bundleGroups[key]) {
        bundleGroups[key] = []
      }
      bundleGroups[key].push(bundle)
    })

    // Process duplicates
    let duplicatesRemoved = 0
    const duplicateGroups = Object.entries(bundleGroups).filter(([key, bundles]) => bundles.length > 1)

    console.log(`Found ${duplicateGroups.length} groups with duplicates`)

    for (const [groupKey, duplicates] of duplicateGroups) {
      console.log(`Processing duplicates for: ${groupKey} (${duplicates.length} bundles)`)
      
      // Keep the most recent bundle (last in array due to ordering)
      const keepBundle = duplicates[duplicates.length - 1]
      const bundlesToRemove = duplicates.slice(0, -1)

      // Merge data from all bundles into the one we're keeping
      const mergedContactsCount = duplicates.reduce((sum, bundle) => sum + (bundle.contacts_count || 0), 0)
      const mergedInsights = [...new Set(duplicates.flatMap(bundle => bundle.key_insights || []))]
      
      // Update the bundle we're keeping with merged data
      const { error: updateError } = await supabaseClient
        .from('marketplace_bundles')
        .update({
          contacts_count: mergedContactsCount,
          key_insights: mergedInsights,
          bundle_version: (keepBundle.bundle_version || 1) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('bundle_id', keepBundle.bundle_id)

      if (updateError) {
        console.error(`Error updating bundle ${keepBundle.bundle_id}:`, updateError)
        continue
      }

      // Deactivate duplicate bundles
      for (const duplicateBundle of bundlesToRemove) {
        const { error: deactivateError } = await supabaseClient
          .from('marketplace_bundles')
          .update({
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('bundle_id', duplicateBundle.bundle_id)

        if (deactivateError) {
          console.error(`Error deactivating bundle ${duplicateBundle.bundle_id}:`, deactivateError)
        } else {
          duplicatesRemoved++
          console.log(`Deactivated duplicate bundle: ${duplicateBundle.title}`)
        }
      }

      console.log(`Kept bundle ${keepBundle.bundle_id} with merged data from ${duplicates.length} bundles`)
    }

    console.log(`Cleanup completed. Removed ${duplicatesRemoved} duplicate bundles`)

    return new Response(JSON.stringify({
      success: true,
      message: 'Duplicate bundle cleanup completed',
      duplicatesRemoved,
      groupsProcessed: duplicateGroups.length,
      totalBundlesScanned: allBundles.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in cleanup-duplicate-bundles:', error)
    return new Response(JSON.stringify({
      error: error.message,
      function: 'cleanup-duplicate-bundles'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
