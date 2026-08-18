'use client';

import { useState, useTransition } from 'react';
import { saveIntegration, toggleIntegration, deleteIntegration } from './actions';

type Platform = 'telegram' | 'whatsapp';

interface Props {
  integrations: any[];
}

function AccordionItem({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 bg-[#0B0E14] hover:bg-gray-900/40 transition text-left">
        <span className="text-xs font-semibold text-white">{title}</span>
        <svg className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="p-4 bg-[#0F1219] border-t border-gray-800">{children}</div>}
    </div>
  );
}

export function IntegrationsClient({ integrations: initialIntegrations }: Props) {
  const [showForm, setShowForm] = useState<Platform | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setMessage(null);
    const result = await saveIntegration(formData);
    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: 'Integration saved successfully!' });
      setShowForm(null);
    }
  }

  function handleToggle(id: string, isActive: boolean) {
    startTransition(() => toggleIntegration(id, isActive));
  }

  function handleDelete(id: string) {
    if (!confirm('Remove this integration?')) return;
    startTransition(() => deleteIntegration(id));
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Platform Integrations</h2>
        <p className="text-xs text-gray-500 mt-1">Connect your messaging platforms. Follow the step-by-step guides below.</p>
      </div>

      {message && (
        <div className={`p-3 rounded text-xs ${message.type === 'success' ? 'bg-emerald-950/30 border border-emerald-500/30 text-emerald-300' : 'bg-rose-950/30 border border-rose-500/30 text-rose-300'}`}>
          {message.text}
        </div>
      )}

      {/* Active Integrations */}
      {initialIntegrations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Active Connections</h3>
          {initialIntegrations.map((intg: any) => (
            <div key={intg.id} className="bg-[#0F1219] border border-gray-800 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  intg.platform === 'telegram' ? 'bg-sky-950/40 text-sky-400 border border-sky-900/30' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30'
                }`}>{intg.platform}</span>
                <span className="text-xs text-white font-mono">
                  {intg.platform === 'telegram' ? `...${intg.bot_token?.slice(-10)}` : intg.phone_number_id}
                </span>
                <span className={`w-2 h-2 rounded-full ${intg.is_active ? 'bg-emerald-400' : 'bg-gray-600'}`} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleToggle(intg.id, intg.is_active)} disabled={isPending}
                  className="text-[10px] px-2 py-1 border border-gray-800 rounded text-gray-400 hover:text-white transition disabled:opacity-50">
                  {intg.is_active ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => handleDelete(intg.id)} disabled={isPending}
                  className="text-[10px] px-2 py-1 border border-gray-800 rounded text-rose-400 hover:text-rose-300 transition disabled:opacity-50">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Setup Guides (Accordion) */}
      <div className="space-y-3">
        <h3 className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Setup Guides</h3>

        <AccordionItem title="📱 How to Connect a Telegram Bot">
          <ol className="space-y-3 text-xs text-gray-400 list-decimal list-inside leading-relaxed">
            <li>Open Telegram and search for <code className="bg-[#0B0E14] px-1.5 py-0.5 rounded text-sky-400 text-[10px]">@BotFather</code></li>
            <li>Send <code className="bg-[#0B0E14] px-1.5 py-0.5 rounded text-sky-400 text-[10px]">/newbot</code> → follow prompts to name your bot</li>
            <li>Copy the <strong className="text-white">Bot Token</strong> (format: <code className="bg-[#0B0E14] px-1 rounded text-gray-300 text-[10px]">123456789:ABCdef...</code>)</li>
            <li>Choose a <strong className="text-white">Webhook Secret</strong> (min 16 chars) — verifies incoming requests</li>
            <li>After saving below, register the webhook:
              <code className="block mt-1 bg-[#0B0E14] px-2 py-1.5 rounded text-[9px] text-gray-300 break-all">
                https://api.telegram.org/bot&lt;TOKEN&gt;/setWebhook?url=https://yourdomain.com/api/webhooks/telegram&amp;secret_token=&lt;SECRET&gt;
              </code>
            </li>
          </ol>
          <button onClick={() => setShowForm('telegram')} className="mt-4 text-xs px-4 py-1.5 bg-sky-600 hover:bg-sky-700 rounded text-white font-bold transition">
            Configure Telegram →
          </button>
        </AccordionItem>

        <AccordionItem title="💬 How to Connect WhatsApp Business API">
          <ol className="space-y-3 text-xs text-gray-400 list-decimal list-inside leading-relaxed">
            <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noopener" className="text-indigo-400 underline">developers.facebook.com</a> → create a Meta Developer account</li>
            <li>Create App → <strong className="text-white">Business</strong> type → add <strong className="text-white">WhatsApp</strong> product</li>
            <li>Find your <strong className="text-white">Phone Number ID</strong> under WhatsApp → API Setup</li>
            <li>Generate a <strong className="text-white">Permanent Access Token</strong>: Business Settings → System Users → Generate Token with <code className="bg-[#0B0E14] px-1 rounded text-gray-300 text-[10px]">whatsapp_business_messaging</code></li>
            <li>Choose a <strong className="text-white">Verify Token</strong> (min 16 chars) for webhook registration</li>
            <li>Set webhook URL in Meta Dashboard:
              <code className="block mt-1 bg-[#0B0E14] px-2 py-1.5 rounded text-[9px] text-gray-300">
                https://yourdomain.com/api/webhooks/whatsapp
              </code>
            </li>
            <li>Subscribe to the <code className="bg-[#0B0E14] px-1 rounded text-gray-300 text-[10px]">messages</code> field</li>
          </ol>
          <button onClick={() => setShowForm('whatsapp')} className="mt-4 text-xs px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded text-white font-bold transition">
            Configure WhatsApp →
          </button>
        </AccordionItem>
      </div>

      {/* Credential Forms */}
      {showForm && (
        <form action={handleSubmit} className="bg-[#0F1219] border border-gray-800 rounded-lg p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">
            {showForm === 'telegram' ? 'Telegram Credentials' : 'WhatsApp Credentials'}
          </h3>
          <input type="hidden" name="platform" value={showForm} />

          {showForm === 'telegram' ? (
            <>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">Bot Token</label>
                <input name="bot_token" type="text" placeholder="123456789:ABCdefGHIjklMNOpqr" required
                  className="w-full bg-[#0B0E14] border border-gray-800 rounded px-3 py-2 text-xs text-white font-mono focus:ring-1 focus:ring-sky-500 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">Webhook Secret</label>
                <input name="verify_secret" type="text" placeholder="min 16 characters" required minLength={16}
                  className="w-full bg-[#0B0E14] border border-gray-800 rounded px-3 py-2 text-xs text-white font-mono focus:ring-1 focus:ring-sky-500 outline-none" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">Phone Number ID</label>
                <input name="phone_number_id" type="text" placeholder="1021908443929651" required
                  className="w-full bg-[#0B0E14] border border-gray-800 rounded px-3 py-2 text-xs text-white font-mono focus:ring-1 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">Access Token</label>
                <input name="access_token" type="password" placeholder="EAAxxxxxxxx..." required
                  className="w-full bg-[#0B0E14] border border-gray-800 rounded px-3 py-2 text-xs text-white font-mono focus:ring-1 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">Verify Token</label>
                <input name="verify_secret" type="text" placeholder="min 16 characters" required minLength={16}
                  className="w-full bg-[#0B0E14] border border-gray-800 rounded px-3 py-2 text-xs text-white font-mono focus:ring-1 focus:ring-emerald-500 outline-none" />
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowForm(null)} className="text-xs px-3 py-1.5 bg-gray-800 rounded text-gray-400 hover:text-white transition">Cancel</button>
            <button type="submit" className={`text-xs px-4 py-1.5 rounded text-white font-bold transition ${showForm === 'telegram' ? 'bg-sky-600 hover:bg-sky-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              Save Integration
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
