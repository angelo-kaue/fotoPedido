-- =====================================================
-- FOTO PEDIDO — MULTI-TENANT COMPLEMENTARY SAFE SQL
-- ONLY THE MISSING PARTS (SAFE VERSION)
-- DO NOT RECREATE tenant_id / tenants / FKs / backfill
-- =====================================================

-- =====================================================
-- 1. HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;


CREATE OR REPLACE FUNCTION public.is_tenant_admin(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
      AND tenant_id = _tenant_id
  );
$$;

-- =====================================================
-- 2. TRIGGER FUNCTIONS
-- =====================================================

-- Admin-created records inherit tenant from logged admin

CREATE OR REPLACE FUNCTION public.set_tenant_from_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_my_tenant_id();
  END IF;

  RETURN NEW;
END;
$$;


-- Event-related records inherit tenant from parent event

CREATE OR REPLACE FUNCTION public.set_tenant_from_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id
    INTO NEW.tenant_id
    FROM public.events
    WHERE id = NEW.event_id
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;


-- Selection photos inherit tenant from parent selection

CREATE OR REPLACE FUNCTION public.set_tenant_from_selection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id
    INTO NEW.tenant_id
    FROM public.selections
    WHERE id = NEW.selection_id
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;


-- Order edit history inherits tenant from selection/order

CREATE OR REPLACE FUNCTION public.set_tenant_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id
    INTO NEW.tenant_id
    FROM public.selections
    WHERE id = NEW.selection_id
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- 3. SAFE DROP OLD TRIGGERS (IF ANY)
-- =====================================================

DROP TRIGGER IF EXISTS trg_events_set_tenant ON public.events;
DROP TRIGGER IF EXISTS trg_event_photos_set_tenant ON public.event_photos;
DROP TRIGGER IF EXISTS trg_selections_set_tenant ON public.selections;
DROP TRIGGER IF EXISTS trg_event_visits_set_tenant ON public.event_visits;
DROP TRIGGER IF EXISTS trg_selection_photos_set_tenant ON public.selection_photos;
DROP TRIGGER IF EXISTS trg_atendimentos_set_tenant ON public.atendimentos;
DROP TRIGGER IF EXISTS trg_order_edit_history_set_tenant ON public.order_edit_history;

-- =====================================================
-- 4. CREATE TRIGGERS
-- =====================================================

-- Admin-created

CREATE TRIGGER trg_events_set_tenant
BEFORE INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.set_tenant_from_user();


CREATE TRIGGER trg_event_photos_set_tenant
BEFORE INSERT ON public.event_photos
FOR EACH ROW
EXECUTE FUNCTION public.set_tenant_from_event();


CREATE TRIGGER trg_atendimentos_set_tenant
BEFORE INSERT ON public.atendimentos
FOR EACH ROW
EXECUTE FUNCTION public.set_tenant_from_event();


-- Public-created but inherited

CREATE TRIGGER trg_selections_set_tenant
BEFORE INSERT ON public.selections
FOR EACH ROW
EXECUTE FUNCTION public.set_tenant_from_event();


CREATE TRIGGER trg_event_visits_set_tenant
BEFORE INSERT ON public.event_visits
FOR EACH ROW
EXECUTE FUNCTION public.set_tenant_from_event();


CREATE TRIGGER trg_selection_photos_set_tenant
BEFORE INSERT ON public.selection_photos
FOR EACH ROW
EXECUTE FUNCTION public.set_tenant_from_selection();


CREATE TRIGGER trg_order_edit_history_set_tenant
BEFORE INSERT ON public.order_edit_history
FOR EACH ROW
EXECUTE FUNCTION public.set_tenant_from_order();

-- =====================================================
-- 5. UNIQUE INDEX FOR photographer_settings
-- =====================================================

CREATE UNIQUE INDEX IF NOT EXISTS photographer_settings_tenant_uniq
ON public.photographer_settings (tenant_id);

-- =====================================================
-- 6. PERFORMANCE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_events_tenant_id
ON public.events (tenant_id);

CREATE INDEX IF NOT EXISTS idx_event_photos_tenant_id
ON public.event_photos (tenant_id);

CREATE INDEX IF NOT EXISTS idx_selections_tenant_id
ON public.selections (tenant_id);

CREATE INDEX IF NOT EXISTS idx_atendimentos_tenant_id
ON public.atendimentos (tenant_id);

CREATE INDEX IF NOT EXISTS idx_event_visits_tenant_id
ON public.event_visits (tenant_id);

CREATE INDEX IF NOT EXISTS idx_selection_photos_tenant_id
ON public.selection_photos (tenant_id);

-- =====================================================
-- DONE
-- =====================================================

-- After running:
-- Test:
-- Admin A → only sees own data
-- Admin B → only sees own data
-- Public → still sees all active events