
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

    console.log('Processing real-time health data streams...')

    // Get pending data from processing queue (health data priority)
    const { data: pendingData, error: queueError } = await supabaseClient
      .from('data_processing_queue')
      .select('*')
      .eq('processing_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(25) // Increased batch size

    if (queueError) {
      console.error('Error fetching pending data:', queueError)
      throw queueError
    }

    if (!pendingData || pendingData.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending data to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${pendingData.length} pending records`)

    const processedCount = await processBatch(supabaseClient, pendingData)

    // Check if we should trigger real-time bundle updates
    await checkForRealTimeBundleUpdates(supabaseClient)

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedCount,
        message: `Successfully processed ${processedCount} records`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-health-streams:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function processBatch(supabaseClient: any, pendingData: any[]): Promise<number> {
  let processedCount = 0

  for (const item of pendingData) {
    try {
      // Mark as processing
      await supabaseClient
        .from('data_processing_queue')
        .update({ 
          processing_status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)

      // Handle health data processing differently
      if (item.data_source_type === 'health_data') {
        // Get raw health data
        const { data: rawHealthData, error: rawError } = await supabaseClient
          .from('raw_health_data')
          .select('*')
          .eq('id', item.raw_data_id)
          .single()

        if (!rawError && rawHealthData) {
          // Extract comprehensive HealthKit data from raw_payload
          const payload = rawHealthData.raw_payload || {}
          const healthkitTypes = payload.healthkit_data_types || {}
          
          // Extract all available health data points
          const stepCount = rawHealthData.step_count || payload.steps || payload.step_count
          const recordedAt = rawHealthData.recorded_at || payload.recorded_at
          
          // Extract comprehensive health metrics
          const heartRate = payload.heartRate || healthkitTypes.vitals?.heart_rate
          const calories = payload.calories || payload.activeEnergyBurned || healthkitTypes.activity?.active_calories
          const sleepHours = payload.sleepHours || payload.timeAsleep || healthkitTypes.sleep?.time_asleep
          const restingHeartRate = payload.restingHeartRate || healthkitTypes.vitals?.resting_heart_rate
          const bloodPressureSystolic = payload.bloodPressureSystolic || healthkitTypes.vitals?.blood_pressure_systolic
          const bloodPressureDiastolic = payload.bloodPressureDiastolic || healthkitTypes.vitals?.blood_pressure_diastolic
          const weight = payload.bodyMass || payload.weight || healthkitTypes.body_measurements?.weight
          const height = payload.height || healthkitTypes.body_measurements?.height
          const bodyFatPercentage = payload.bodyFatPercentage || healthkitTypes.body_measurements?.body_fat_percentage
          const vo2Max = payload.vo2Max || healthkitTypes.vitals?.vo2_max
          const walkingDistance = payload.distanceWalkingRunning || healthkitTypes.activity?.walking_distance
          const cyclingDistance = payload.distanceCycling || healthkitTypes.activity?.cycling_distance
          const flightsClimbed = payload.flightsClimbed || healthkitTypes.activity?.flights_climbed
          
          // Nutrition data
          const dietaryEnergy = payload.dietaryEnergyConsumed || healthkitTypes.nutrition?.calories
          const protein = payload.dietaryProtein || healthkitTypes.nutrition?.protein
          const totalFat = payload.dietaryFatTotal || healthkitTypes.nutrition?.fat_total
          const carbohydrates = payload.dietaryCarbohydrates || healthkitTypes.nutrition?.carbohydrates
          const water = payload.dietaryWater || healthkitTypes.nutrition?.water
          const caffeine = payload.dietaryCaffeine || healthkitTypes.nutrition?.caffeine

          if (stepCount !== null && stepCount !== undefined && stepCount >= 0) {
            // Calculate comprehensive data quality and completeness scores
            const basicMetrics = [stepCount, heartRate, calories, sleepHours].filter(v => v != null).length
            const vitals = [heartRate, restingHeartRate, bloodPressureSystolic, bloodPressureDiastolic].filter(v => v != null).length
            const nutrition = [dietaryEnergy, protein, totalFat, carbohydrates, water, caffeine].filter(v => v != null).length
            const hasBodyMeasurements = weight != null || height != null || bodyFatPercentage != null
            const hasSleepData = sleepHours != null && sleepHours > 0
            
            // Use comprehensive data quality calculation
            const dataQualityScore = 0.3 + (basicMetrics * 0.1) + (vitals * 0.08) + (nutrition * 0.05) + 
                                   (hasBodyMeasurements ? 0.15 : 0) + (hasSleepData ? 0.15 : 0)
            const dataCompletenessScore = Math.min(1.0, (basicMetrics + vitals + nutrition) / 20)

            // Insert comprehensive health metrics
            const [healthMetricResult, stagedResult] = await Promise.allSettled([
              supabaseClient.from('health_metrics').insert({
                step_count: stepCount,
                heart_rate: heartRate,
                calories_burned: calories,
                recorded_at: recordedAt,
                user_id: rawHealthData.user_id,
                activity_type: 'comprehensive_health',
                device_type: rawHealthData.device_type || payload.device_type || 'iPhone Health App',
                raw_data: {
                  comprehensive_healthkit: true,
                  data_points_count: basicMetrics + vitals + nutrition,
                  source: payload.source || 'apple_health'
                }
              }),
              supabaseClient.from('staged_health_data').insert({
                pseudo_user_id: rawHealthData.user_id ? `user_${rawHealthData.user_id.slice(0, 8)}` : 'anonymous',
                activity_type: 'comprehensive_health_data',
                steps_count: stepCount,
                average_heartrate: heartRate,
                resting_heart_rate: restingHeartRate,
                calories_burned: calories,
                sleep_duration: sleepHours ? sleepHours * 60 : null, // Convert to minutes
                systolic_blood_pressure: bloodPressureSystolic,
                diastolic_blood_pressure: bloodPressureDiastolic,
                weight_kg: weight,
                height_cm: height,
                body_fat_percentage: bodyFatPercentage,
                vo2_max: vo2Max,
                distance_walking_running_meters: walkingDistance,
                distance_cycling_meters: cyclingDistance,
                flights_climbed: flightsClimbed,
                dietary_energy_kcal: dietaryEnergy,
                protein_g: protein,
                total_fat_g: totalFat,
                carbohydrates_g: carbohydrates,
                water_ml: water,
                caffeine_mg: caffeine,
                device_type: rawHealthData.device_type || payload.device_type || 'iPhone Health App',
                data_quality_score: Math.min(1.0, dataQualityScore),
                data_completeness_score: dataCompletenessScore,
                raw_data_id: rawHealthData.id,
                healthkit_source_bundles: {
                  comprehensive_healthkit: true,
                  original_payload: payload,
                  extracted_data_points: basicMetrics + vitals + nutrition
                }
              })
            ])

            // Mark raw data as processed
            await supabaseClient
              .from('raw_health_data')
              .update({ 
                processed: true,
                processing_completed_at: new Date().toISOString()
              })
              .eq('id', rawHealthData.id)

            console.log(`Processed health data: ${stepCount} steps, health_metric: ${healthMetricResult.status}, staged: ${stagedResult.status}`)
          }
        }
      } else {
        // Call anonymization function for other data types
        const anonymizeResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/anonymize-and-stage-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            rawData: item,
            trigger: 'process_health_streams'
          })
        })

        if (!anonymizeResponse.ok) {
          throw new Error(`Anonymization failed: ${await anonymizeResponse.text()}`)
        }
      }

      // Mark as completed
      await supabaseClient
        .from('data_processing_queue')
        .update({ 
          processing_status: 'completed',
          processing_stage: 'staging',
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
      
      processedCount++

    } catch (error) {
      console.error(`Error processing item ${item.id}:`, error)
      
      // Update retry count and mark as failed if max retries exceeded
      const newRetryCount = (item.retry_count || 0) + 1
      const status = newRetryCount >= 3 ? 'failed' : 'pending'
      
      await supabaseClient
        .from('data_processing_queue')
        .update({ 
          processing_status: status,
          retry_count: newRetryCount,
          error_details: { error: error.message, timestamp: new Date().toISOString() },
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
    }
  }

  return processedCount
}

async function checkForRealTimeBundleUpdates(supabaseClient: any) {
  // Check if enough new data has been processed to trigger bundle updates
  const { data: recentData, error } = await supabaseClient
    .from('staged_health_data')
    .select('id')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour

  if (error) {
    console.error('Error checking recent data:', error)
    return
  }

  // If we have significant new data, trigger bundle regeneration
  if (recentData && recentData.length > 50) {
    console.log(`Triggering real-time bundle update with ${recentData.length} new records`)
    
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-health-data-bundle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({ trigger: 'real-time' })
    })
  }
}
