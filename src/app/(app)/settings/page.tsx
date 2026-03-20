'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Save, User } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Header from '@/components/layout/Header';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { Profile } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [notifPrefs, setNotifPrefs] = useState({ email: true, push: true, in_app: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = supabaseRef.current;
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        const p = data as Profile;
        setProfile(p);
        setFullName(p.full_name || '');
        setNotifPrefs(p.notification_preferences || { email: true, push: true, in_app: true });
      }
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    const { error } = await supabaseRef.current
      .from('profiles')
      .update({
        full_name: fullName,
        notification_preferences: notifPrefs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (error) {
      toast('Erreur lors de la sauvegarde', 'error');
    } else {
      toast('Profil mis à jour');
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabaseRef.current.auth.signOut();
    router.push('/');
  };

  const togglePref = (key: 'email' | 'push' | 'in_app') => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Parametres" showBack />

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Profile Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="h-14 w-14 rounded-full bg-brand-100 flex items-center justify-center">
              <User className="h-7 w-7 text-brand-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{profile?.full_name || 'Utilisateur'}</p>
              <p className="text-sm text-gray-500">{profile?.email}</p>
            </div>
          </div>

          <Input
            label="Nom complet"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Votre nom"
          />
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Notifications</h2>

          <div className="space-y-4">
            {([
              { key: 'email' as const, label: 'Email', desc: 'Recevoir les rappels par email' },
              { key: 'push' as const, label: 'Push', desc: 'Notifications push sur le mobile' },
              { key: 'in_app' as const, label: 'In-App', desc: "Notifications dans l'application" },
            ]).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifPrefs[key]}
                  onClick={() => togglePref(key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifPrefs[key] ? 'bg-brand-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifPrefs[key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <Button fullWidth loading={saving} onClick={handleSave}>
          <Save className="h-4 w-4" />
          Enregistrer
        </Button>

        {/* Logout */}
        <Button variant="danger" fullWidth loading={loggingOut} onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Se deconnecter
        </Button>
      </div>
    </div>
  );
}
