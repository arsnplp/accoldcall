'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Reminder } from '@/types';

type ReminderFilter = 'today' | 'upcoming' | 'past';

export function useReminders(filter: ReminderFilter = 'today') {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let query = supabase
      .from('reminders')
      .select('*, leads!inner(prenom, nom, societe, telephone, email)')
      .eq('leads.user_id', user.id)
      .order('date_heure_notification', { ascending: true });

    switch (filter) {
      case 'today':
        query = query
          .gte('date_heure_notification', today.toISOString())
          .lt('date_heure_notification', tomorrow.toISOString())
          .eq('statut_notification', 'en_attente');
        break;
      case 'upcoming':
        query = query
          .gte('date_heure_notification', tomorrow.toISOString())
          .eq('statut_notification', 'en_attente');
        break;
      case 'past':
        query = query
          .or(`statut_notification.neq.en_attente,date_heure_notification.lt.${today.toISOString()}`);
        break;
    }

    const { data, error } = await query;
    if (!error && data) {
      setReminders(data as Reminder[]);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const markAsDone = async (reminderId: string) => {
    await supabaseRef.current
      .from('reminders')
      .update({ statut_notification: 'envoyee' })
      .eq('id', reminderId);
    fetchReminders();
  };

  return { reminders, loading, refetch: fetchReminders, markAsDone };
}
