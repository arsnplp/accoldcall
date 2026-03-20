'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Phone, Check, Clock } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Header from '@/components/layout/Header';
import { createClient } from '@/lib/supabase/client';
import { formatDateTime } from '@/lib/utils';
import { Reminder, REMINDER_TYPE_LABELS } from '@/types';

type Tab = 'today' | 'upcoming' | 'past';

const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'upcoming', label: 'A venir' },
  { key: 'past', label: 'Passes' },
];

export default function RemindersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingDone, setMarkingDone] = useState<string | null>(null);

  const supabaseRef = useRef(createClient());

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('reminders')
      .select('*, leads!inner(prenom, nom, societe, telephone)')
      .eq('leads.user_id', user.id)
      .order('date_heure_notification', { ascending: activeTab !== 'past' });

    if (activeTab === 'today') {
      query = query
        .gte('date_heure_notification', `${today}T00:00:00`)
        .lte('date_heure_notification', `${today}T23:59:59`)
        .eq('statut_notification', 'en_attente');
    } else if (activeTab === 'upcoming') {
      query = query
        .gt('date_heure_notification', `${today}T23:59:59`)
        .eq('statut_notification', 'en_attente');
    } else {
      query = query.or(
        `statut_notification.neq.en_attente,date_heure_notification.lt.${today}T00:00:00`
      );
    }

    const { data, error } = await query;

    if (!error && data) {
      setReminders(data as Reminder[]);
    }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const markAsDone = async (id: string) => {
    setMarkingDone(id);
    const { error } = await supabaseRef.current
      .from('reminders')
      .update({ statut_notification: 'envoyee' })
      .eq('id', id);

    if (!error) {
      setReminders((prev) => prev.filter((r) => r.id !== id));
    }
    setMarkingDone(null);
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'j_4':
        return 'bg-brand-100 text-brand-700';
      case 'j_2':
        return 'bg-accent-100 text-accent-700';
      case 'j_1':
        return 'bg-danger-50 text-danger-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Mes Rappels" rightAction={<Bell className="h-5 w-5 text-gray-500" />} />

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Clock className="h-6 w-6 text-gray-400 animate-spin" />
          </div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Aucun rappel</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <Card key={reminder.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(
                          reminder.type_rappel
                        )}`}
                      >
                        {REMINDER_TYPE_LABELS[reminder.type_rappel]}
                      </span>
                      {reminder.statut_notification === 'envoyee' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-700">
                          Fait
                        </span>
                      )}
                    </div>
                    {reminder.leads && (
                      <p className="font-medium text-gray-900 truncate">
                        {reminder.leads.prenom} {reminder.leads.nom}
                        {reminder.leads.societe && (
                          <span className="text-gray-500 font-normal"> - {reminder.leads.societe}</span>
                        )}
                      </p>
                    )}
                    {reminder.message && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{reminder.message}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(reminder.date_heure_notification)}
                    </p>
                  </div>
                </div>

                {activeTab !== 'past' && (
                  <div className="flex gap-2">
                    {reminder.leads?.telephone && (
                      <a href={`tel:${reminder.leads.telephone}`} className="flex-1">
                        <Button variant="outline" size="sm" fullWidth>
                          <Phone className="h-4 w-4" />
                          Appeler
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      loading={markingDone === reminder.id}
                      onClick={() => markAsDone(reminder.id)}
                    >
                      <Check className="h-4 w-4" />
                      Fait
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
