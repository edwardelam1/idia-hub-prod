import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Forcing bundle title updates...')

    // Update Athletic Performance bundles
    const { data: athleticUpdates, error: athleticError } = await supabaseClient
      .from('marketplace_bundles')
      .update({
        title: 'Athletic Performance Analytics Collection',
        updated_at: new Date().toISOString()
      })
      .like('title', 'Athletic Performance Analytics: %')
      .eq('is_active', true)
      .select()

    if (athleticError) {
      console.error('Error updating athletic bundles:', athleticError)
    } else {
      console.log(`Updated ${athleticUpdates?.length || 0} athletic performance bundles`)
    }

    // Update Urban Wellness bundles
    const { data: urbanUpdates, error: urbanError } = await supabaseClient
      .from('marketplace_bundles')
      .update({
        title: 'Urban Wellness Dynamics Collection',
        updated_at: new Date().toISOString()
      })
      .like('title', 'Urban Wellness Dynamics: %')
      .eq('is_active', true)
      .select()

    if (urbanError) {
      console.error('Error updating urban bundles:', urbanError)
    } else {
      console.log(`Updated ${urbanUpdates?.length || 0} urban wellness bundles`)
    }

    // Update Regional Health bundles
    const { data: regionalUpdates, error: regionalError } = await supabaseClient
      .from('marketplace_bundles')
      .update({
        title: 'Regional Health Trends Collection',
        updated_at: new Date().toISOString()
      })
      .like('title', 'Regional Health Trends: %')
      .eq('is_active', true)
      .select()

    if (regionalError) {
      console.error('Error updating regional bundles:', regionalError)
    } else {
      console.log(`Updated ${regionalUpdates?.length || 0} regional health bundles`)
    }

    const totalUpdated = (athleticUpdates?.length || 0) + (urbanUpdates?.length || 0) + (regionalUpdates?.length || 0)

    console.log(`Total bundles updated: ${totalUpdated}`)

    return new Response(
      JSON.stringify({
        success: true,
        totalUpdated,
        athleticBundles: athleticUpdates?.length || 0,
        urbanBundles: urbanUpdates?.length || 0,
        regionalBundles: regionalUpdates?.length || 0,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in force-bundle-update:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})