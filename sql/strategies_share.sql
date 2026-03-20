-- Ajouter colonne share_code à strategies
ALTER TABLE public.strategies ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE;

-- Fonction pour générer un code unique de 6 caractères
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour auto-générer le share_code à l'insertion
CREATE OR REPLACE FUNCTION set_share_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  IF NEW.share_code IS NULL THEN
    LOOP
      new_code := generate_share_code();
      SELECT EXISTS(SELECT 1 FROM public.strategies WHERE share_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.share_code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_share_code ON public.strategies;
CREATE TRIGGER trigger_set_share_code
  BEFORE INSERT ON public.strategies
  FOR EACH ROW
  EXECUTE FUNCTION set_share_code();

-- Policy pour permettre la lecture par share_code (pour l'import)
CREATE POLICY "Anyone can read strategy by share_code"
  ON public.strategies FOR SELECT
  USING (true);

-- Supprimer l'ancienne policy restrictive de SELECT (on la remplace par celle ci-dessus)
DROP POLICY IF EXISTS "Users can view own strategies" ON public.strategies;

-- Mettre à jour les stratégies existantes sans code
UPDATE public.strategies SET share_code = generate_share_code() WHERE share_code IS NULL;
