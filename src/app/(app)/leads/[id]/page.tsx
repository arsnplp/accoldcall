'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Phone,
  Mail,
  Building2,
  Calendar,
  FileText,
  Bell,
  Clock,
  Pencil,
  ArrowRightLeft,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import {
  Lead,
  LeadStatus,
  Reminder,
  LeadHistory,
  LEAD_STATUS_CONFIG,
  REMINDER_TYPE_LABELS,
} from '@/types';
import { formatDateTime, getInitials, cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: LeadStatus; label: string; description: string }[] = [
  { value: 'no_show', label: 'No Show', description: 'Le prospect ne s\'est pas pr\u00e9sent\u00e9' },
  { value: 'pas_interesse', label: 'Pas int\u00e9ress\u00e9', description: 'Le prospect n\'est pas int\u00e9ress\u00e9' },
  { value: 'en_reflexion', label: 'En r\u00e9flexion', description: 'Le prospect r\u00e9fl\u00e9chit' },
  { value: 'qualifie', label: 'Qualifi\u00e9', description: 'Le prospect est qualifi\u00e9' },
  { value: 'reporte', label: 'Report\u00e9', description: 'RDV report\u00e9 \u00e0 une nouvelle date' },
  { value: 'book_r2', label: 'Book R2', description: 'Second RDV programm\u00e9' },
];

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [lead, setLead] = useState<Lead | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [history, setHistory] = useState<LeadHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Status modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | null>(null);
  const [newDate, setNewDate] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const needsDate = selectedStatus === 'reporte' || selectedStatus === 'book_r2';

  useEffect(() => {
    fetchAll();
  }, [id]);

  async function fetchAll() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [leadRes, remindersRes, historyRes] = await Promise.all([
      supabase.from('leads').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase
        .from('reminders')
        .select('*')
        .eq('lead_id', id)
        .order('date_heure_notification', { ascending: true }),
      supabase
        .from('lead_history')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false }),
    ]);

    if (leadRes.data) setLead(leadRes.data);
    if (remindersRes.data) setReminders(remindersRes.data);
    if (historyRes.data) setHistory(historyRes.data);
    setLoading(false);
  }

  async function handleStatusChange() {
    if (!selectedStatus || !lead) return;
    if (needsDate && !newDate) {
      toast('Veuillez s\u00e9lectionner une date', 'error');
      return;
    }

    setUpdatingStatus(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      if (needsDate) {
        const { error } = await supabase.rpc('reschedule_lead', {
          p_lead_id: lead.id,
          p_user_id: user.id,
          p_new_date: new Date(newDate).toISOString(),
          p_new_status: selectedStatus,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('update_lead_status', {
          p_lead_id: lead.id,
          p_user_id: user.id,
          p_new_status: selectedStatus,
        });
        if (error) throw error;
      }

      toast('Statut mis \u00e0 jour');
      setStatusModalOpen(false);
      setSelectedStatus(null);
      setNewDate('');
      setLoading(true);
      await fetchAll();
    } catch (err) {
      console.error(err);
      toast('Erreur lors de la mise \u00e0 jour', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (loading || !lead) {
    return (
      <div>
        <Header title="Lead" showBack />
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-gray-400">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <Header
        title={`${lead.prenom} ${lead.nom}`}
        showBack
        rightAction={
          <Link
            href={`/leads/${lead.id}/edit`}
            className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200"
          >
            <Pencil className="h-5 w-5 text-gray-600" />
          </Link>
        }
      />

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Lead header card */}
        <Card className="text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-16 w-16 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-xl font-bold text-brand-700">
                {getInitials(lead.prenom, lead.nom)}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {lead.prenom} {lead.nom}
              </h2>
              {lead.societe && (
                <p className="text-sm text-gray-500 flex items-center justify-center gap-1 mt-0.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {lead.societe}
                </p>
              )}
            </div>
            <Badge status={lead.statut} className="text-sm px-3 py-1" />
          </div>

          {/* Quick actions */}
          <div className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-gray-100">
            {lead.telephone && (
              <a
                href={`tel:${lead.telephone}`}
                className="flex flex-col items-center gap-1"
              >
                <div className="h-11 w-11 rounded-full bg-success-100 flex items-center justify-center hover:bg-success-200 transition-colors">
                  <Phone className="h-5 w-5 text-success-700" />
                </div>
                <span className="text-xs text-gray-500">Appeler</span>
              </a>
            )}
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="flex flex-col items-center gap-1"
              >
                <div className="h-11 w-11 rounded-full bg-brand-100 flex items-center justify-center hover:bg-brand-200 transition-colors">
                  <Mail className="h-5 w-5 text-brand-700" />
                </div>
                <span className="text-xs text-gray-500">Email</span>
              </a>
            )}
          </div>
        </Card>

        {/* Lead info */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Informations</h3>
          <div className="space-y-3">
            {lead.telephone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">{lead.telephone}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">{lead.email}</span>
              </div>
            )}
            {lead.societe && (
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">{lead.societe}</span>
              </div>
            )}
            {lead.date_heure_rdv && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">{formatDateTime(lead.date_heure_rdv)}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Change status button */}
        <Button
          variant="outline"
          fullWidth
          onClick={() => setStatusModalOpen(true)}
          className="gap-2"
        >
          <ArrowRightLeft className="h-4 w-4" />
          Changer le statut
        </Button>

        {/* Notes */}
        {(lead.note_brute || lead.note_restructuree) && (
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              Notes
            </h3>
            <div className="space-y-3">
              {lead.note_brute && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Note brute</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.note_brute}</p>
                </div>
              )}
              {lead.note_restructuree && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Note restructur&eacute;e</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.note_restructuree}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Reminders */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-gray-400" />
            Rappels
            <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {reminders.length}
            </span>
          </h3>
          {reminders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucun rappel</p>
          ) : (
            <div className="space-y-2">
              {reminders.map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl',
                    r.statut_notification === 'envoyee'
                      ? 'bg-success-50'
                      : r.statut_notification === 'annulee'
                        ? 'bg-gray-50'
                        : 'bg-accent-50'
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {REMINDER_TYPE_LABELS[r.type_rappel]}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(r.date_heure_notification)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      r.statut_notification === 'envoyee'
                        ? 'bg-success-100 text-success-700'
                        : r.statut_notification === 'annulee'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-accent-100 text-accent-700'
                    )}
                  >
                    {r.statut_notification === 'en_attente'
                      ? 'En attente'
                      : r.statut_notification === 'envoyee'
                        ? 'Envoy\u00e9e'
                        : 'Annul\u00e9e'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* History */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            Historique
            <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {history.length}
            </span>
          </h3>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucun historique</p>
          ) : (
            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200" />
              <div className="space-y-4">
                {history.map((h) => (
                  <div key={h.id} className="flex gap-3 relative">
                    <div className="flex-shrink-0 h-4 w-4 rounded-full bg-white border-2 border-gray-300 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium">{h.action}</p>
                      {h.ancien_statut && h.nouveau_statut && (
                        <p className="text-xs text-gray-500">
                          {LEAD_STATUS_CONFIG[h.ancien_statut]?.label} &rarr;{' '}
                          {LEAD_STATUS_CONFIG[h.nouveau_statut]?.label}
                        </p>
                      )}
                      {h.nouvelle_date_rdv && (
                        <p className="text-xs text-gray-500">
                          Nouveau RDV : {formatDateTime(h.nouvelle_date_rdv)}
                        </p>
                      )}
                      {h.details && (
                        <p className="text-xs text-gray-400 mt-0.5">{h.details}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDateTime(h.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Status change modal */}
      <Modal
        open={statusModalOpen}
        onClose={() => {
          setStatusModalOpen(false);
          setSelectedStatus(null);
          setNewDate('');
        }}
        title="Changer le statut"
      >
        <div className="space-y-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedStatus(opt.value)}
              className={cn(
                'w-full text-left p-3 rounded-xl border transition-colors',
                selectedStatus === opt.value
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:bg-gray-50'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'h-3 w-3 rounded-full',
                    LEAD_STATUS_CONFIG[opt.value].bgColor
                  )}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {needsDate && selectedStatus && (
          <div className="mt-4">
            <Input
              label="Nouvelle date et heure du RDV"
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              setStatusModalOpen(false);
              setSelectedStatus(null);
              setNewDate('');
            }}
          >
            Annuler
          </Button>
          <Button
            fullWidth
            disabled={!selectedStatus}
            loading={updatingStatus}
            onClick={handleStatusChange}
          >
            Confirmer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
