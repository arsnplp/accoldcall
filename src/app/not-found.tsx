import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Page introuvable</h2>
        <p className="text-gray-500 mb-6">Cette page n&apos;existe pas.</p>
        <Link
          href="/dashboard"
          className="bg-brand-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-600 transition-colors"
        >
          Retour au dashboard
        </Link>
      </div>
    </div>
  );
}
