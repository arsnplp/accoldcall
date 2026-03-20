'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Lead, LeadStatus } from '@/types';
import { formatDateTime, getInitials, cn } from '@/lib/utils';

const STATUS_FILTERS: { value: LeadStatus | 'tous'; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'nouveau', label: 'Nouveau' },
  { value: 'qualifie', label: 'Qualifi\u00e9' },
  { value: 'en_reflexion', label: 'En r\u00e9flexion' },
  { value: 'reporte', label: 'Report\u00e9' },
  { value: 'book_r2', label: 'Book R2' },
  { value: 'no_show', label: 'No Show' },
  { value: 'pas_interesse', label: 'Pas int\u00e9ress\u00e9' },
];

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'tous'>('tous');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeads() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'tous') {
        query = query.eq('statut', statusFilter);
      }

      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`nom.ilike.${term},prenom.ilike.${term},societe.ilike.${term}`);
      }

      const { data } = await query;
      if (data) setLeads(data);
      setLoading(false);
    }

    setLoading(true);
    fetchLeads();
  }, [search, statusFilter]);

  return (
    <div className="pb-24">
      <Header title="Mes Leads" />

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un lead..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                statusFilter === filter.value
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Leads list */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-pulse text-gray-400">Chargement...</div>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Aucun lead trouv&eacute;</p>
            <p className="text-gray-400 text-sm mt-1">
              {search || statusFilter !== 'tous'
                ? 'Essayez de modifier vos filtres'
                : 'Cr\u00e9ez votre premier lead pour commencer'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {leads.map((lead) => (
              <Card
                key={lead.id}
                onClick={() => router.push(`/leads/${lead.id}`)}
                className="flex items-center gap-3"
              >
                <div className="flex-shrink-0 h-11 w-11 rounded-full bg-brand-100 flex items-center justify-center">
                  <span className="text-sm font-semibold text-brand-700">
                    {getInitials(lead.prenom, lead.nom)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {lead.prenom} {lead.nom}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {lead.societe && (
                      <p className="text-xs text-gray-500 truncate">{lead.societe}</p>
                    )}
                    {lead.societe && lead.date_heure_rdv && (
                      <span className="text-gray-300">&bull;</span>
                    )}
                    {lead.date_heure_rdv && (
                      <p className="text-xs text-gray-400 flex-shrink-0">
                        {formatDateTime(lead.date_heure_rdv)}
                      </p>
                    )}
                  </div>
                </div>
                <Badge status={lead.statut} />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
