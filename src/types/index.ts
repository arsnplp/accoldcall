export type LeadStatus =
  | 'nouveau'
  | 'no_show'
  | 'pas_interesse'
  | 'en_reflexion'
  | 'qualifie'
  | 'reporte'
  | 'book_r2';

export type ReminderType = 'j_4' | 'j_2' | 'j_1';

export type ReminderStatus = 'en_attente' | 'envoyee' | 'annulee';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  push_subscription: Record<string, unknown> | null;
  notification_preferences: {
    email: boolean;
    push: boolean;
    in_app: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  user_id: string;
  prenom: string;
  nom: string;
  societe: string | null;
  telephone: string | null;
  email: string | null;
  date_heure_rdv: string | null;
  note_brute: string | null;
  note_audio_url: string | null;
  note_restructuree: string | null;
  statut: LeadStatus;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  lead_id: string;
  user_id: string;
  type_rappel: ReminderType;
  date_heure_notification: string;
  statut_notification: ReminderStatus;
  message: string | null;
  channels_sent: string[];
  created_at: string;
  updated_at: string;
  // Joined fields
  leads?: Pick<Lead, 'prenom' | 'nom' | 'societe' | 'telephone' | 'email'>;
}

export interface LeadHistory {
  id: string;
  lead_id: string;
  user_id: string;
  action: string;
  ancien_statut: LeadStatus | null;
  nouveau_statut: LeadStatus | null;
  ancienne_date_rdv: string | null;
  nouvelle_date_rdv: string | null;
  details: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  reminder_id: string | null;
  lead_id: string | null;
  titre: string;
  message: string;
  lu: boolean;
  created_at: string;
}

export interface LeadFormData {
  prenom: string;
  nom: string;
  societe: string;
  telephone: string;
  email: string;
  date_heure_rdv: string;
  note_brute: string;
}

export const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
  nouveau: { label: 'Nouveau', color: 'text-brand-700', bgColor: 'bg-brand-100' },
  no_show: { label: 'No Show', color: 'text-danger-700', bgColor: 'bg-danger-50' },
  pas_interesse: { label: 'Pas intéressé', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  en_reflexion: { label: 'En réflexion', color: 'text-accent-700', bgColor: 'bg-accent-50' },
  qualifie: { label: 'Qualifié', color: 'text-success-700', bgColor: 'bg-success-100' },
  reporte: { label: 'Reporté', color: 'text-accent-600', bgColor: 'bg-accent-100' },
  book_r2: { label: 'Book R2', color: 'text-brand-600', bgColor: 'bg-brand-100' },
};

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  j_4: 'J-4',
  j_2: 'J-2',
  j_1: 'Veille de RDV',
};
