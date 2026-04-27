-- Remove all test recovery data and other test data
DELETE FROM staged_health_data 
WHERE device_type = 'Recovery Test' 
   OR pseudo_user_id LIKE 'user_%' 
   OR pseudo_user_id = 'user_68457871';