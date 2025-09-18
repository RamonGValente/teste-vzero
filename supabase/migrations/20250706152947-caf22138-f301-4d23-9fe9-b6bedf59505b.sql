-- Update the contact ranking function to use contact count instead of activity logs
DROP FUNCTION IF EXISTS public.get_contacts_ranking();

CREATE OR REPLACE FUNCTION public.get_contacts_ranking()
RETURNS TABLE(
  user_id uuid,
  full_name text, 
  avatar_url text,
  contact_count bigint,
  status text
)
LANGUAGE sql
STABLE
AS $function$
  SELECT 
    p.id AS user_id,
    p.full_name,
    p.avatar_url,
    COUNT(c.id) AS contact_count,
    p.status
  FROM profiles p
  LEFT JOIN contacts c ON c.user_id = p.id
  GROUP BY p.id, p.full_name, p.avatar_url, p.status
  ORDER BY COUNT(c.id) DESC
  LIMIT 20;
$function$;