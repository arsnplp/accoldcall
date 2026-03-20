-- ============================================
-- ColdCall Tracker — RESET COMPLET + RECREATION
-- ============================================
-- Exécuter ce script pour tout supprimer et recréer proprement

-- 1. Supprimer les triggers d'abord
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_lead_created ON leads;
DROP TRIGGER IF EXISTS on_lead_updated ON leads;
DROP TRIGGER IF EXISTS on_reminder_updated ON reminders;
DROP TRIGGER IF EXISTS on_profile_updated ON profiles;

-- 2. Supprimer les vues
DROP VIEW IF EXISTS reminders_today;
DROP VIEW IF EXISTS upcoming_appointments;
DROP VIEW IF EXISTS leads_to_recontact;

-- 3. Supprimer les fonctions
DROP FUNCTION IF EXISTS calculate_reminders(UUID, UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS cancel_lead_reminders(UUID);
DROP FUNCTION IF EXISTS reschedule_lead(UUID, UUID, TIMESTAMPTZ, lead_status);
DROP FUNCTION IF EXISTS update_lead_status(UUID, UUID, lead_status);
DROP FUNCTION IF EXISTS trigger_create_reminders();
DROP FUNCTION IF EXISTS trigger_update_reminders();
DROP FUNCTION IF EXISTS trigger_updated_at();
DROP FUNCTION IF EXISTS handle_new_user();

-- 4. Supprimer les tables (ordre important pour les foreign keys)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS lead_history CASCADE;
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 5. Supprimer les types enum
DROP TYPE IF EXISTS notification_channel;
DROP TYPE IF EXISTS reminder_status;
DROP TYPE IF EXISTS reminder_type;
DROP TYPE IF EXISTS lead_status;

-- 6. Supprimer les politiques storage
DROP POLICY IF EXISTS "Users can upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their audio" ON storage.objects;

-- Note: Le bucket ne peut pas être supprimé via SQL, ON CONFLICT DO NOTHING plus bas

-- ============================================
-- MAINTENANT ON RECREE TOUT
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TYPES ENUM
CREATE TYPE lead_status AS ENUM (
  'nouveau', 'no_show', 'pas_interesse', 'en_reflexion', 'qualifie', 'reporte', 'book_r2'
);
CREATE TYPE reminder_type AS ENUM ('j_4', 'j_2', 'j_1');
CREATE TYPE reminder_status AS ENUM ('en_attente', 'envoyee', 'annulee');
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'push');

-- TABLE PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  push_subscription JSONB,
  notification_preferences JSONB DEFAULT '{"email": true, "push": true, "in_app": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE LEADS
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  societe TEXT,
  telephone TEXT,
  email TEXT,
  date_heure_rdv TIMESTAMPTZ,
  note_brute TEXT,
  note_audio_url TEXT,
  note_restructuree TEXT,
  statut lead_status DEFAULT 'nouveau',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_statut ON leads(statut);
CREATE INDEX idx_leads_date_rdv ON leads(date_heure_rdv);
CREATE INDEX idx_leads_user_statut ON leads(user_id, statut);
CREATE INDEX idx_leads_user_date ON leads(user_id, date_heure_rdv);
CREATE INDEX idx_leads_search ON leads USING gin(
  to_tsvector('french', coalesce(prenom, '') || ' ' || coalesce(nom, '') || ' ' || coalesce(societe, ''))
);

-- TABLE REMINDERS
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type_rappel reminder_type NOT NULL,
  date_heure_notification TIMESTAMPTZ NOT NULL,
  statut_notification reminder_status DEFAULT 'en_attente',
  message TEXT,
  channels_sent notification_channel[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminders_user ON reminders(user_id);
CREATE INDEX idx_reminders_lead ON reminders(lead_id);
CREATE INDEX idx_reminders_date ON reminders(date_heure_notification);
CREATE INDEX idx_reminders_statut ON reminders(statut_notification);
CREATE INDEX idx_reminders_pending ON reminders(user_id, statut_notification, date_heure_notification)
  WHERE statut_notification = 'en_attente';

-- TABLE LEAD_HISTORY
CREATE TABLE lead_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  ancien_statut lead_status,
  nouveau_statut lead_status,
  ancienne_date_rdv TIMESTAMPTZ,
  nouvelle_date_rdv TIMESTAMPTZ,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_history_lead ON lead_history(lead_id);
CREATE INDEX idx_history_user ON lead_history(user_id);

-- TABLE NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES reminders(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  lu BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, lu) WHERE lu = FALSE;

-- ============================================
-- FONCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION calculate_reminders(
  p_lead_id UUID, p_user_id UUID, p_date_rdv TIMESTAMPTZ
) RETURNS VOID AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_lead_prenom TEXT;
  v_lead_nom TEXT;
  v_lead_societe TEXT;
  v_days_until INTEGER;
  v_reminder_date TIMESTAMPTZ;
BEGIN
  SELECT prenom, nom, societe INTO v_lead_prenom, v_lead_nom, v_lead_societe
  FROM leads WHERE id = p_lead_id;

  v_days_until := EXTRACT(DAY FROM (p_date_rdv - v_now));

  IF v_days_until >= 4 THEN
    v_reminder_date := p_date_rdv - INTERVAL '4 days';
    IF v_reminder_date > v_now THEN
      INSERT INTO reminders (lead_id, user_id, type_rappel, date_heure_notification, message)
      VALUES (p_lead_id, p_user_id, 'j_4', v_reminder_date,
        'Faire un rappel pour ' || v_lead_prenom || ' ' || v_lead_nom ||
        CASE WHEN v_lead_societe IS NOT NULL THEN ' – ' || v_lead_societe ELSE '' END || ' – Relance J-4');
    END IF;
  END IF;

  IF v_days_until >= 2 THEN
    v_reminder_date := p_date_rdv - INTERVAL '2 days';
    IF v_reminder_date > v_now THEN
      INSERT INTO reminders (lead_id, user_id, type_rappel, date_heure_notification, message)
      VALUES (p_lead_id, p_user_id, 'j_2', v_reminder_date,
        'Faire un rappel pour ' || v_lead_prenom || ' ' || v_lead_nom ||
        CASE WHEN v_lead_societe IS NOT NULL THEN ' – ' || v_lead_societe ELSE '' END || ' – Relance J-2');
    END IF;
  END IF;

  IF v_days_until >= 1 THEN
    v_reminder_date := p_date_rdv - INTERVAL '1 day';
    IF v_reminder_date > v_now THEN
      INSERT INTO reminders (lead_id, user_id, type_rappel, date_heure_notification, message)
      VALUES (p_lead_id, p_user_id, 'j_1', v_reminder_date,
        'Faire un rappel pour ' || v_lead_prenom || ' ' || v_lead_nom ||
        CASE WHEN v_lead_societe IS NOT NULL THEN ' – ' || v_lead_societe ELSE '' END || ' – Relance veille de RDV');
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cancel_lead_reminders(p_lead_id UUID) RETURNS VOID AS $$
BEGIN
  UPDATE reminders SET statut_notification = 'annulee', updated_at = NOW()
  WHERE lead_id = p_lead_id AND statut_notification = 'en_attente';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reschedule_lead(
  p_lead_id UUID, p_user_id UUID, p_new_date TIMESTAMPTZ, p_new_status lead_status
) RETURNS VOID AS $$
DECLARE
  v_old_date TIMESTAMPTZ;
  v_old_status lead_status;
BEGIN
  SELECT date_heure_rdv, statut INTO v_old_date, v_old_status FROM leads WHERE id = p_lead_id;
  -- cancel + calculate sont gérés par le trigger on_lead_updated, pas besoin de les appeler ici
  UPDATE leads SET date_heure_rdv = p_new_date, statut = p_new_status, updated_at = NOW() WHERE id = p_lead_id;
  INSERT INTO lead_history (lead_id, user_id, action, ancien_statut, nouveau_statut, ancienne_date_rdv, nouvelle_date_rdv, details)
  VALUES (p_lead_id, p_user_id,
    CASE WHEN p_new_status = 'reporte' THEN 'report' ELSE 'book_r2' END,
    v_old_status, p_new_status, v_old_date, p_new_date,
    'RDV reprogrammé du ' || to_char(v_old_date, 'DD/MM/YYYY HH24:MI') || ' au ' || to_char(p_new_date, 'DD/MM/YYYY HH24:MI'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_lead_status(
  p_lead_id UUID, p_user_id UUID, p_new_status lead_status
) RETURNS VOID AS $$
DECLARE
  v_old_status lead_status;
BEGIN
  SELECT statut INTO v_old_status FROM leads WHERE id = p_lead_id;
  PERFORM cancel_lead_reminders(p_lead_id);
  UPDATE leads SET statut = p_new_status, updated_at = NOW() WHERE id = p_lead_id;
  INSERT INTO lead_history (lead_id, user_id, action, ancien_statut, nouveau_statut, details)
  VALUES (p_lead_id, p_user_id, 'changement_statut', v_old_status, p_new_status,
    'Statut changé de ' || v_old_status::TEXT || ' à ' || p_new_status::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION trigger_create_reminders() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_heure_rdv IS NOT NULL THEN
    PERFORM calculate_reminders(NEW.id, NEW.user_id, NEW.date_heure_rdv);
    INSERT INTO lead_history (lead_id, user_id, action, nouveau_statut, nouvelle_date_rdv, details)
    VALUES (NEW.id, NEW.user_id, 'creation', NEW.statut, NEW.date_heure_rdv, 'Lead créé');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_lead_created AFTER INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION trigger_create_reminders();

CREATE OR REPLACE FUNCTION trigger_update_reminders() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.date_heure_rdv IS DISTINCT FROM NEW.date_heure_rdv AND NEW.date_heure_rdv IS NOT NULL THEN
    PERFORM cancel_lead_reminders(NEW.id);
    PERFORM calculate_reminders(NEW.id, NEW.user_id, NEW.date_heure_rdv);
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_lead_updated BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION trigger_update_reminders();

CREATE OR REPLACE FUNCTION trigger_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_reminder_updated BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

CREATE TRIGGER on_profile_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- ============================================
-- RLS
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Leads
CREATE POLICY "Users can view their own leads" ON leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own leads" ON leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own leads" ON leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own leads" ON leads FOR DELETE USING (auth.uid() = user_id);

-- Reminders
CREATE POLICY "Users can view their own reminders" ON reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own reminders" ON reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reminders" ON reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reminders" ON reminders FOR DELETE USING (auth.uid() = user_id);

-- Lead history
CREATE POLICY "Users can view their own history" ON lead_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create history entries" ON lead_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notifications" ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- VUES
-- ============================================

CREATE OR REPLACE VIEW reminders_today AS
SELECT r.*, l.prenom, l.nom, l.societe, l.telephone, l.email as lead_email
FROM reminders r JOIN leads l ON r.lead_id = l.id
WHERE r.date_heure_notification::DATE = CURRENT_DATE AND r.statut_notification = 'en_attente';

CREATE OR REPLACE VIEW upcoming_appointments AS
SELECT l.*, (SELECT COUNT(*) FROM reminders r WHERE r.lead_id = l.id AND r.statut_notification = 'en_attente') as pending_reminders
FROM leads l WHERE l.date_heure_rdv > NOW() AND l.statut IN ('nouveau', 'reporte', 'book_r2')
ORDER BY l.date_heure_rdv ASC;

CREATE OR REPLACE VIEW leads_to_recontact AS
SELECT l.* FROM leads l WHERE l.statut IN ('en_reflexion', 'reporte', 'book_r2')
ORDER BY l.date_heure_rdv ASC;

-- ============================================
-- STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-notes', 'audio-notes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload audio" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'audio-notes' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their audio" ON storage.objects FOR SELECT
  USING (bucket_id = 'audio-notes' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their audio" ON storage.objects FOR DELETE
  USING (bucket_id = 'audio-notes' AND auth.uid()::TEXT = (storage.foldername(name))[1]);
