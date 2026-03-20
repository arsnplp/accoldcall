import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-brand-50 to-white">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-brand-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <span className="text-2xl font-black text-white tracking-tight">AC</span>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Accold Call</h1>
        <p className="text-gray-500 mb-10">
          Gérez vos leads et rendez-vous commerciaux en toute simplicité
        </p>

        <div className="w-full flex flex-col gap-3">
          <Link
            href="/auth/signup"
            className="w-full flex items-center justify-center gap-2 bg-brand-500 text-white py-3.5 rounded-xl font-medium text-base hover:bg-brand-600 active:bg-brand-700 transition-colors"
          >
            Créer un compte
            <ArrowRight className="h-5 w-5" />
          </Link>

          <Link
            href="/auth/login"
            className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 py-3.5 rounded-xl font-medium text-base border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
