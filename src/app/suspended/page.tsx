import { signOut } from '../(auth)/actions';

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h1 className="text-xl font-bold text-white">Account Suspended</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            Your account has been temporarily suspended by the platform administrator.
            All dashboard features are currently inaccessible.
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-4 text-left space-y-2">
          <p className="text-xs font-semibold text-rose-300">What does this mean?</p>
          <ul className="text-[11px] text-rose-400/80 space-y-1.5 list-disc list-inside">
            <li>Your AI agents and webhook integrations are paused</li>
            <li>Your data is safe and has not been deleted</li>
            <li>Contact the platform administrator for more information</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <a
            href="mailto:support@yourdomain.com"
            className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition text-center"
          >
            Contact Support
          </a>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-gray-400 hover:text-white text-xs font-medium rounded-lg border border-white/5 transition"
            >
              Sign Out
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-gray-600">
          If you believe this is an error, please reach out to the administrator immediately.
        </p>
      </div>
    </div>
  );
}
