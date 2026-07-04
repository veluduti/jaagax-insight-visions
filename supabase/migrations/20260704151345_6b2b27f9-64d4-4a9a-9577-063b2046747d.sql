UPDATE public.hotel_bookings hb
SET booked_by_agent_id = a.id,
    source = COALESCE(NULLIF(hb.source, ''), 'agent')
FROM public.agents a
WHERE hb.booked_by_agent_id IS NULL
  AND hb.user_id IS NOT NULL
  AND a.user_id = hb.user_id;