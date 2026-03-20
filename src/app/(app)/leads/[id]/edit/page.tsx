'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { LeadFormData } from '@/types';

export default function EditLeadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof LeadFormData, string>>>({});
  const [form, setForm] = useState<LeadFormData>({
    prenom: '',
    nom: '',
    societe: '',
    telephone: '',
    email: '',
    date_heure_rdv: '',
    note_brute: '',
  });

  useEffect(() => {
    async function fetchLead() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        toast('Lead introuvable', 'error');
        router.back();
        return;
      }

      setForm({
        prenom: data.prenom,
        nom: data.nom,
        societe: data.societe || '',
        telephone: data.telephone || '',
        email: data.email || '',
        date_heure_rdv: data.date_heure_rdv
          ? data.date_heure_rdv.slice(0, 16)
          : '',
        note_brute: data.note_brute || '',
      });
      setLoading(false);
    }

    fetchLead();
  }, [id]);

  function updateField(field: keyof LeadFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof LeadFormData, string>> = {};
    if (!form.prenom.trim()) newErrors.prenom = 'Le pr\u00e9nom est requis';
    if (!form.nom.trim()) newErrors.nom = 'Le nom est requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('leads')
        .update({
          prenom: form.prenom.trim(),
          nom: form.nom.trim(),
          societe: form.societe.trim() || null,
          telephone: form.telephone.trim() || null,
          email: form.email.trim() || null,
          date_heure_rdv: form.date_heure_rdv || null,
          note_brute: form.note_brute.trim() || null,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast('Lead mis \u00e0 jour');
      router.push(`/leads/${id}`);
    } catch (err) {
      console.error(err);
      toast('Erreur lors de la mise \u00e0 jour', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <Header title="Modifier le lead" showBack />
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-gray-400">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <Header title="Modifier le lead" showBack />

      <form onSubmit={handleSubmit} className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Pr&eacute;nom *"
            placeholder="Jean"
            value={form.prenom}
            onChange={(e) => updateField('prenom', e.target.value)}
            error={errors.prenom}
          />
          <Input
            label="Nom *"
            placeholder="Dupont"
            value={form.nom}
            onChange={(e) => updateField('nom', e.target.value)}
            error={errors.nom}
          />
        </div>

        <Input
          label="Soci&eacute;t&eacute;"
          placeholder="Nom de l'entreprise"
          value={form.societe}
          onChange={(e) => updateField('societe', e.target.value)}
        />

        <Input
          label="T&eacute;l&eacute;phone"
          type="tel"
          placeholder="06 12 34 56 78"
          value={form.telephone}
          onChange={(e) => updateField('telephone', e.target.value)}
        />

        <Input
          label="Email"
          type="email"
          placeholder="jean@example.com"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
        />

        <Input
          label="Date et heure du RDV"
          type="datetime-local"
          value={form.date_heure_rdv}
          onChange={(e) => updateField('date_heure_rdv', e.target.value)}
        />

        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Notes
          </label>
          <textarea
            placeholder="Notes sur le lead..."
            value={form.note_brute}
            onChange={(e) => updateField('note_brute', e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base resize-none"
          />
        </div>

        <div className="pt-2 flex gap-3">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => router.back()}
          >
            Annuler
          </Button>
          <Button type="submit" fullWidth size="lg" loading={saving}>
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  );
}
