'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Bell, Users, Clock, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Lead, Reminder } from '@/types';
import { formatDateTime, formatRelativeDate, getInitials } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [reminders, setReminders] = useState<(Reminder & { leads: Pick<Lead, 'prenom' | 'nom' | 'societe' | 'telephone' | 'email'> })[]>([]);
  const [upcomingRdv, setUpcomingRdv] = useState<Lead[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      setUserName(profile?.full_name || user.email?.split('@')[0] || '');

      // Today's reminders
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data: remindersData } = await supabase
        .from('reminders')
        .select('*, leads!inner(prenom, nom, societe, telephone, email)')
        .eq('leads.user_id', user.id)
        .gte('date_heure_notification', todayStart.toISOString())
        .lte('date_heure_notification', todayEnd.toISOString())
        .eq('statut_notification', 'en_attente')
        .order('date_heure_notification', { ascending: true });

      if (remindersData) setReminders(remindersData as typeof reminders);

      // Upcoming RDV
      const { data: rdvData } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .gt('date_heure_rdv', new Date().toISOString())
        .in('statut', ['nouveau', 'reporte', 'book_r2'])
        .order('date_heure_rdv', { ascending: true })
        .limit(5);

      if (rdvData) setUpcomingRdv(rdvData);

      // Recent leads
      const { data: recentData } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentData) setRecentLeads(recentData);

      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div>
        <Header title="Dashboard" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-gray-400">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <Header
        title="Dashboard"
        rightAction={
          <button
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200"
            title="Se déconnecter"
          >
            <LogOut className="h-5 w-5 text-gray-600" />
          </button>
        }
      />

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Greeting */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Bonjour{userName ? `, ${userName}` : ''} !
          </h2>
          <p className="text-gray-500 mt-1">
            Voici votre activit&eacute; du jour
          </p>
        </div>

        {/* Relances du jour */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-5 w-5 text-accent-500" />
            <h3 className="text-base font-semibold text-gray-900">
              Relances du jour
            </h3>
            <span className="ml-auto text-sm font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {reminders.length}
            </span>
          </div>

          {reminders.length === 0 ? (
            <Card className="text-center py-6">
              <p className="text-gray-400 text-sm">Aucune relance aujourd&apos;hui</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {reminders.map((reminder) => (
                <Link key={reminder.id} href={`/leads/${reminder.lead_id}`}>
                  <Card className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-accent-100 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-accent-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {reminder.leads?.prenom} {reminder.leads?.nom}
                      </p>
                      <p className="text-xs text-gray-500">
                        {reminder.leads?.societe || 'Sans soci\u00e9t\u00e9'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatDateTime(reminder.date_heure_notification)}
                    </span>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* RDV a venir */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-brand-500" />
            <h3 className="text-base font-semibold text-gray-900">
              RDV &agrave; venir
            </h3>
            <span className="ml-auto text-sm font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {upcomingRdv.length}
            </span>
          </div>

          {upcomingRdv.length === 0 ? (
            <Card className="text-center py-6">
              <p className="text-gray-400 text-sm">Aucun RDV &agrave; venir</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {upcomingRdv.map((lead) => (
                <Link key={lead.id} href={`/leads/${lead.id}`}>
                  <Card className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-brand-700">
                        {getInitials(lead.prenom, lead.nom)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {lead.prenom} {lead.nom}
                      </p>
                      <p className="text-xs text-gray-500">
                        {lead.date_heure_rdv ? formatRelativeDate(lead.date_heure_rdv) : '—'}
                        {' \u2022 '}
                        {lead.date_heure_rdv ? formatDateTime(lead.date_heure_rdv) : ''}
                      </p>
                    </div>
                    <Badge status={lead.statut} />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Leads recents */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-success-500" />
            <h3 className="text-base font-semibold text-gray-900">
              Leads r&eacute;cents
            </h3>
            <span className="ml-auto text-sm font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {recentLeads.length}
            </span>
          </div>

          {recentLeads.length === 0 ? (
            <Card className="text-center py-6">
              <p className="text-gray-400 text-sm">Aucun lead pour le moment</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentLeads.map((lead) => (
                <Link key={lead.id} href={`/leads/${lead.id}`}>
                  <Card className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-600">
                        {getInitials(lead.prenom, lead.nom)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {lead.prenom} {lead.nom}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500 truncate">
                          {lead.societe || 'Sans soci\u00e9t\u00e9'}
                        </p>
                        <Clock className="h-3 w-3 text-gray-400" />
                        <p className="text-xs text-gray-400">
                          {formatRelativeDate(lead.created_at)}
                        </p>
                      </div>
                    </div>
                    <Badge status={lead.statut} />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
