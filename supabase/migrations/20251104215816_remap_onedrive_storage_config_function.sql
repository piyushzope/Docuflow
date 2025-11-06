-- Migration: Create function to remap OneDrive storage configs
-- This function remaps routing rules from old OneDrive configs to a new one,
-- and optionally deactivates old OneDrive configs

CREATE OR REPLACE FUNCTION remap_onedrive_storage_config(
  org_id uuid,
  new_config_id uuid
)
RETURNS TABLE(
  rules_updated integer,
  old_configs_deactivated integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rules_count integer := 0;
  deactivated_count integer := 0;
BEGIN
  -- Remap routing rules that reference old OneDrive configs to the new config
  WITH updated_rules AS (
    UPDATE routing_rules
    SET 
      actions = jsonb_set(
        actions,
        '{storage_id}',
        to_jsonb(new_config_id::text),
        false
      ),
      updated_at = now()
    WHERE 
      organization_id = org_id
      AND actions->>'storage_id' IN (
        SELECT id::text
        FROM storage_configs
        WHERE 
          organization_id = org_id
          AND provider = 'onedrive'
          AND id <> new_config_id
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO rules_count FROM updated_rules;

  -- Deactivate old OneDrive configs (except the new one)
  UPDATE storage_configs
  SET 
    is_active = false,
    is_default = false,
    updated_at = now()
  WHERE 
    organization_id = org_id
    AND provider = 'onedrive'
    AND id <> new_config_id
    AND (is_active = true OR is_default = true);
  
  GET DIAGNOSTICS deactivated_count = ROW_COUNT;

  RETURN QUERY SELECT rules_count, deactivated_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION remap_onedrive_storage_config(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION remap_onedrive_storage_config IS 'Remaps routing rules from old OneDrive configs to a new one and deactivates old configs';

