
ALTER TABLE public.nl_landing_signals_view RENAME TO nl_landing_signals;
ALTER INDEX idx_nl_landing_signals_type RENAME TO idx_nl_landing_signals_type_created;
-- idx_nl_landing_signals_user already correctly named
