'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, Plus, Trash2, ChevronDown, ChevronUp, Lightbulb, Share2, Download, Copy, Check } from 'lucide-react';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';

interface Strategy {
  id: string;
  titre: string;
  contenu: string;
  share_code: string;
  created_at: string;
}

const DEFAULT_TIPS = [
  {
    titre: '📞 Confirmer le RDV la veille',
    contenu: 'Envoyez un SMS ou appelez la veille pour confirmer. Un simple "Je vous confirme notre RDV demain à 14h, à bientôt !" réduit les no-shows de 30%.',
  },
  {
    titre: '⏰ Rappel le matin même',
    contenu: 'Un petit rappel le jour J, 2-3h avant le RDV : "Bonjour, juste un rappel pour notre échange prévu à 14h. Au plaisir !" Bref et professionnel.',
  },
  {
    titre: '🎯 Créer de la valeur avant le RDV',
    contenu: 'Envoyez un document utile (étude de cas, guide) avant le RDV. Le prospect se sentira engagé et aura moins envie d\'annuler.',
  },
  {
    titre: '📅 Proposer un créneau alternatif',
    contenu: 'En confirmant, proposez toujours une alternative : "Si ce créneau ne vous convient plus, je suis aussi disponible jeudi à 10h." Ça évite l\'annulation sèche.',
  },
  {
    titre: '🤝 Impliquer un décisionnaire',
    contenu: 'Si possible, suggérez d\'inviter un collègue décisionnaire. Plus il y a de personnes impliquées, moins il y a de chances d\'annulation.',
  },
];

export default function StrategiesPage() {
  const { toast } = useToast();
  const supabaseRef = useRef(createClient());
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTip, setExpandedTip] = useState<number | null>(null);
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  const [form, setForm] = useState({ titre: '', contenu: '' });
  const [importCode, setImportCode] = useState('');

  const fetchStrategies = useCallback(async () => {
    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('strategies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setStrategies(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titre.trim() || !form.contenu.trim()) {
      toast('Titre et contenu requis', 'error');
      return;
    }

    setSaving(true);
    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase
      .from('strategies')
      .insert({
        user_id: user.id,
        titre: form.titre.trim(),
        contenu: form.contenu.trim(),
      });

    if (error) {
      toast('Erreur lors de l\'ajout', 'error');
    } else {
      toast('Stratégie ajoutée !');
      setForm({ titre: '', contenu: '' });
      setShowModal(false);
      fetchStrategies();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const supabase = supabaseRef.current;
    const { error } = await supabase
      .from('strategies')
      .delete()
      .eq('id', id);

    if (!error) {
      setStrategies((prev) => prev.filter((s) => s.id !== id));
      toast('Stratégie supprimée');
    } else {
      toast('Erreur lors de la suppression', 'error');
    }
    setDeleting(null);
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    const code = importCode.trim().toUpperCase();
    if (!code) { toast('Entrez un code', 'error'); return; }

    setImporting(true);
    const supabase = supabaseRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setImporting(false); return; }

    const { data: source, error: fetchError } = await supabase
      .from('strategies')
      .select('titre, contenu')
      .eq('share_code', code)
      .single();

    if (fetchError || !source) {
      toast('Code introuvable', 'error');
      setImporting(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('strategies')
      .insert({ user_id: user.id, titre: source.titre, contenu: source.contenu });

    if (insertError) {
      toast('Erreur lors de l\'import', 'error');
    } else {
      toast('Stratégie importée !');
      setImportCode('');
      setShowImportModal(false);
      fetchStrategies();
    }
    setImporting(false);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    toast('Code copié !');
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header
        title="Anti No-Show"
        showBack
        rightAction={
          <div className="flex items-center gap-1">
            <button onClick={() => setShowImportModal(true)} className="p-2">
              <Download className="h-5 w-5 text-brand-500" />
            </button>
            <button onClick={() => setShowModal(true)} className="p-2 -mr-2">
              <Plus className="h-5 w-5 text-brand-500" />
            </button>
          </div>
        }
      />

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-6">
        {/* Section conseils */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-accent-500" />
            <h2 className="text-base font-semibold text-gray-900">Conseils éprouvés</h2>
          </div>
          <div className="space-y-2">
            {DEFAULT_TIPS.map((tip, index) => (
              <Card key={index} className="!p-0 overflow-hidden">
                <button
                  onClick={() => setExpandedTip(expandedTip === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="text-sm font-medium text-gray-900 flex-1">{tip.titre}</span>
                  {expandedTip === index ? (
                    <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                  )}
                </button>
                {expandedTip === index && (
                  <div className="px-4 pb-4 -mt-1">
                    <p className="text-sm text-gray-600 leading-relaxed">{tip.contenu}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Section mes stratégies */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-brand-500" />
            <h2 className="text-base font-semibold text-gray-900">Mes stratégies</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-gray-400">Chargement...</div>
            </div>
          ) : strategies.length === 0 ? (
            <Card className="text-center py-8">
              <Shield className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Aucune stratégie personnelle</p>
              <p className="text-gray-400 text-xs mt-1">Ajoutez ou importez des techniques anti no-show</p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
                  <Plus className="h-4 w-4" />
                  Créer
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
                  <Download className="h-4 w-4" />
                  Importer
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {strategies.map((strat) => (
                <Card key={strat.id} className="!p-0 overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedStrategy(expandedStrategy === strat.id ? null : strat.id)
                    }
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <span className="text-sm font-medium text-gray-900 flex-1">{strat.titre}</span>
                    {expandedStrategy === strat.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                    )}
                  </button>
                  {expandedStrategy === strat.id && (
                    <div className="px-4 pb-4 -mt-1 space-y-3">
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {strat.contenu}
                      </p>
                      {/* Code de partage */}
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Share2 className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500">Code :</span>
                          <span className="text-sm font-mono font-bold text-brand-600">{strat.share_code}</span>
                        </div>
                        <button
                          onClick={() => copyCode(strat.share_code)}
                          className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          {copiedId === strat.share_code ? (
                            <Check className="h-4 w-4 text-success-500" />
                          ) : (
                            <Copy className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => handleDelete(strat.id)}
                        disabled={deleting === strat.id}
                        className="flex items-center gap-1.5 text-xs text-danger-400 hover:text-danger-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deleting === strat.id ? 'Suppression...' : 'Supprimer'}
                      </button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal ajout */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouvelle stratégie">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Titre"
            placeholder="Ex: Envoyer un résumé avant le RDV"
            value={form.titre}
            onChange={(e) => setForm((prev) => ({ ...prev, titre: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contenu</label>
            <textarea
              placeholder="Décrivez votre stratégie en détail..."
              value={form.contenu}
              onChange={(e) => setForm((prev) => ({ ...prev, contenu: e.target.value }))}
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-base resize-none"
            />
          </div>
          <Button type="submit" fullWidth loading={saving}>
            Ajouter la stratégie
          </Button>
        </form>
      </Modal>

      {/* Modal import */}
      <Modal open={showImportModal} onClose={() => setShowImportModal(false)} title="Importer une stratégie">
        <form onSubmit={handleImport} className="space-y-4">
          <p className="text-sm text-gray-500">
            Entrez le code de partage reçu pour importer la stratégie dans votre liste.
          </p>
          <Input
            label="Code de partage"
            placeholder="Ex: A3K7M2"
            value={importCode}
            onChange={(e) => setImportCode(e.target.value.toUpperCase())}
          />
          <Button type="submit" fullWidth loading={importing}>
            <Download className="h-4 w-4" />
            Importer
          </Button>
        </form>
      </Modal>
    </div>
  );
}
