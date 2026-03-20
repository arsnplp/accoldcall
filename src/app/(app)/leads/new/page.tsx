'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import AudioRecorder from '@/components/notes/AudioRecorder';
import { LeadFormData } from '@/types';

export default function NewLeadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const [noteRestructuree, setNoteRestructuree] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
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

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast('Vous devez \u00eatre connect\u00e9', 'error');
        return;
      }

      const { data, error } = await supabase
        .from('leads')
        .insert({
          user_id: user.id,
          prenom: form.prenom.trim(),
          nom: form.nom.trim(),
          societe: form.societe.trim() || null,
          telephone: form.telephone.trim() || null,
          email: form.email.trim() || null,
          date_heure_rdv: form.date_heure_rdv || null,
          note_brute: form.note_brute.trim() || null,
          note_audio_url: audioUrl || null,
          note_restructuree: noteRestructuree || null,
          statut: 'nouveau',
        })
        .select()
        .single();

      if (error) throw error;

      toast('Lead cr\u00e9\u00e9 avec succ\u00e8s');
      router.push(`/leads/${data.id}`);
    } catch (err) {
      console.error(err);
      toast('Erreur lors de la cr\u00e9ation du lead', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pb-24">
      <Header title="Nouveau Lead" showBack />

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
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <button
              type="button"
              onClick={() => setShowAudio(!showAudio)}
              className="text-sm text-brand-500 font-medium"
            >
              {showAudio ? 'Écrire manuellement' : 'Enregistrer audio'}
            </button>
          </div>
          {showAudio ? (
            <AudioRecorder
              onTranscriptionComplete={(text) => updateField('note_brute', text)}
              onRecordingComplete={(url) => setAudioUrl(url)}
              onRestructuredComplete={(text) => setNoteRestructuree(text)}
            />
          ) : (
            <textarea
              placeholder="Notes sur le lead..."
              value={form.note_brute}
              onChange={(e) => updateField('note_brute', e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base resize-none"
            />
          )}
        </div>

        {noteRestructuree && (
          <div className="bg-brand-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-brand-800 mb-2">Note restructurée</h3>
            <div className="text-sm text-brand-900 whitespace-pre-wrap">{noteRestructuree}</div>
          </div>
        )}

        <div className="pt-2">
          <Button type="submit" fullWidth size="lg" loading={loading}>
            Cr&eacute;er le lead
          </Button>
        </div>
      </form>
    </div>
  );
}
