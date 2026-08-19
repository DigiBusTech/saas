'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Phone,
  Copy,
  Check,
  Eye,
  EyeOff,
  Shield,
  ChevronDown,
  ExternalLink,
  Loader2,
  Zap,
} from 'lucide-react';
import type { Workspace } from '@/lib/types/database';
import { saveWorkspaceIntegration } from '../../workspaces/actions';

interface IntegrationStatus {
  telegram: boolean;
  whatsapp: boolean;
  maskedTokens: Record<string, string>;
}

interface Props {
  workspace: Workspace;
  integrationStatus: IntegrationStatus;
  publicAppUrl: string;
}

export function WorkspaceIntegrationsClient({ workspace, integrationStatus, publicAppUrl }: Props) {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState('');

  // Accordion states
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const webhookBase = publicAppUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const telegramWebhookUrl = `${webhookBase}/api/webhooks/telegram/${workspace.id}`;
  const whatsappWebhookUrl = `${webhookBase}/api/webhooks/whatsapp/${workspace.id}`;

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);

    const fd = new FormData(e.currentTarget);
    fd.set('platform', activeTab);

    const result = await saveWorkspaceIntegration(workspace.id, fd);
    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const tabs = [
    {
      key: 'whatsapp' as const,
      label: 'WhatsApp Business',
      icon: Phone,
      connected: integrationStatus.whatsapp,
      color: 'emerald',
    },
    {
      key: 'telegram' as const,
      label: 'Telegram Bot',
      icon: MessageCircle,
      connected: integrationStatus.telegram,
      color: 'sky',
    },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-400" />
          Integration Settings
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Configure API credentials for <span className="text-indigo-400 font-medium">{workspace.name}</span>
        </p>
      </div>

      {/* Critical Webhook Alert */}
      <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-amber-300">CRITICAL: Unique Webhook URL</p>
          <p className="text-[10px] text-amber-400/80 mt-1 leading-relaxed">
            This Webhook URL is unique to THIS specific business (<span className="font-bold text-amber-300">{workspace.name}</span>). 
            Do not use this URL for your other businesses. Each business has its own unique webhook endpoint for proper message routing.
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-300
              ${activeTab === tab.key
                ? 'bg-zinc-900/60 backdrop-blur-md border border-white/10 text-white shadow-lg'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'}`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.key ? (tab.color === 'emerald' ? 'text-emerald-400' : 'text-sky-400') : ''}`} />
            {tab.label}
            {tab.connected && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Status & Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs"
          >
            {error}
          </motion.div>
        )}
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> Credentials saved and encrypted successfully.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {activeTab === 'telegram' ? (
            <TelegramConfig
              workspace={workspace}
              webhookUrl={telegramWebhookUrl}
              maskedTokens={integrationStatus.maskedTokens}
              showTokens={showTokens}
              setShowTokens={setShowTokens}
              copiedField={copiedField}
              copyToClipboard={copyToClipboard}
              openAccordion={openAccordion}
              setOpenAccordion={setOpenAccordion}
              saving={saving}
              handleSave={handleSave}
            />
          ) : (
            <WhatsAppConfig
              workspace={workspace}
              webhookUrl={whatsappWebhookUrl}
              maskedTokens={integrationStatus.maskedTokens}
              showTokens={showTokens}
              setShowTokens={setShowTokens}
              copiedField={copiedField}
              copyToClipboard={copyToClipboard}
              openAccordion={openAccordion}
              setOpenAccordion={setOpenAccordion}
              saving={saving}
              handleSave={handleSave}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// --- Telegram Config Panel ---
function TelegramConfig({
  workspace, webhookUrl, maskedTokens, showTokens, setShowTokens,
  copiedField, copyToClipboard, openAccordion, setOpenAccordion, saving, handleSave,
}: any) {
  return (
    <div className="space-y-4">
      {/* Webhook URL Card */}
      <div className="rounded-xl bg-zinc-900/60 backdrop-blur-md border border-white/10 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-white flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            Webhook URL
          </h3>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Auto-generated
          </span>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2.5 rounded-lg bg-zinc-800/80 border border-white/5 text-[11px] text-sky-300 font-mono truncate">
            {webhookUrl}
          </code>
          <button
            onClick={() => copyToClipboard(webhookUrl, 'tg-webhook')}
            className="px-3 py-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition text-sky-400"
          >
            {copiedField === 'tg-webhook' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Credentials Form */}
      <form onSubmit={handleSave} className="rounded-xl bg-zinc-900/60 backdrop-blur-md border border-white/10 p-5 space-y-4">
        <h3 className="text-xs font-semibold text-white">Bot Token</h3>
        <div className="relative">
          <input
            name="telegram_bot_token"
            type={showTokens['tg_token'] ? 'text' : 'password'}
            placeholder={maskedTokens.telegram_bot_token || 'Enter your Telegram Bot Token'}
            className="w-full px-3 py-2.5 pr-10 rounded-lg bg-zinc-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600
              focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20 outline-none transition font-mono"
          />
          <button
            type="button"
            onClick={() => setShowTokens((p: any) => ({ ...p, tg_token: !p.tg_token }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            {showTokens['tg_token'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Webhook Secret</label>
          <input
            name="telegram_webhook_secret"
            type="password"
            placeholder={maskedTokens.telegram_webhook_secret || 'Set the secret used in Telegram webhook configuration'}
            minLength={8}
            required={!maskedTokens.telegram_webhook_secret}
            className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20 outline-none transition font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600
            hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 shadow-lg shadow-sky-500/25 transition-all flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
          Encrypt & Save
        </button>
      </form>

      {/* Setup Guide Accordions */}
      <div className="space-y-2">
        <SetupAccordion
          id="tg-step1"
          title="Step 1: Create a Bot with BotFather"
          openAccordion={openAccordion}
          setOpenAccordion={setOpenAccordion}
        >
          <ol className="list-decimal list-inside space-y-2 text-xs text-gray-400">
            <li>Open Telegram and search for <code className="text-sky-400">@BotFather</code></li>
            <li>Send <code className="text-sky-400">/newbot</code> command</li>
            <li>Choose a name and username for your bot</li>
            <li>BotFather will give you a <strong className="text-white">Bot Token</strong> — copy it</li>
            <li>Paste it in the field above and click &quot;Encrypt &amp; Save&quot;</li>
          </ol>
        </SetupAccordion>

        <SetupAccordion
          id="tg-step2"
          title="Step 2: Set Webhook URL"
          openAccordion={openAccordion}
          setOpenAccordion={setOpenAccordion}
        >
          <ol className="list-decimal list-inside space-y-2 text-xs text-gray-400">
            <li>Paste the generated URL into the BotFather webhook setup or call Telegram&apos;s <code className="text-sky-400">setWebhook</code> API.</li>
            <li>The <strong className="text-white">Webhook Secret</strong> is not the Telegram chat ID. It is a private random value you choose, for example <code className="text-sky-400">sabi_tg_2026_a9f3</code>.</li>
            <li>Save the same secret in this screen and send it to Telegram as the <code className="text-sky-400">secret_token</code> parameter.</li>
            <li>Telegram will then send it on every request as <code className="text-sky-400">X-Telegram-Bot-Api-Secret-Token</code>; SabiBio verifies that header before dispatching the message.</li>
            <li>The chat ID is generated by Telegram per conversation and is never entered as the webhook secret.</li>
          </ol>
          <div className="mt-3 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-[10px] text-sky-200">
            Example: <code>https://api.telegram.org/botBOT_TOKEN/setWebhook?url=WEBHOOK_URL&amp;secret_token=YOUR_RANDOM_SECRET</code>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-xs text-gray-400">
            <li>Copy the auto-generated webhook URL above</li>
            <li>Open this URL in your browser (replace <code className="text-sky-400">YOUR_TOKEN</code>):</li>
            <li>
              <code className="block mt-1 px-2 py-1.5 rounded bg-zinc-800 text-[10px] text-sky-300 break-all">
                https://api.telegram.org/botYOUR_TOKEN/setWebhook?url={webhookUrl}
              </code>
            </li>
            <li>You should see <code className="text-emerald-400">{`{"ok":true}`}</code></li>
          </ol>
        </SetupAccordion>

        <SetupAccordion
          id="tg-step3"
          title="Step 3: Set Bot Description"
          openAccordion={openAccordion}
          setOpenAccordion={setOpenAccordion}
        >
          <ol className="list-decimal list-inside space-y-2 text-xs text-gray-400">
            <li>Go back to your chat with <code className="text-sky-400">@BotFather</code></li>
            <li>Send <code className="text-sky-400">/setdescription</code></li>
            <li>Select your bot from the list</li>
            <li>Type a short description of your business (e.g. &quot;Your 24/7 AI Shopping Assistant for [Brand Name]&quot;)</li>
            <li>This text appears on your bot&apos;s profile page <strong className="text-white">before</strong> a user clicks <strong className="text-white">Start</strong></li>
          </ol>
        </SetupAccordion>

        <SetupAccordion
          id="tg-step4"
          title="Step 4: Set Bot Logo"
          openAccordion={openAccordion}
          setOpenAccordion={setOpenAccordion}
        >
          <ol className="list-decimal list-inside space-y-2 text-xs text-gray-400">
            <li>In your chat with <code className="text-sky-400">@BotFather</code>, send <code className="text-sky-400">/setuserpic</code></li>
            <li>Select your bot from the list</li>
            <li>Upload your <strong className="text-white">business logo</strong> as a photo (square, at least 512×512px recommended)</li>
            <li>BotFather will confirm the profile photo has been set</li>
            <li>Your bot will now display your brand logo in chats and search results</li>
          </ol>
        </SetupAccordion>
      </div>
    </div>
  );
}

// --- WhatsApp Config Panel ---
function WhatsAppConfig({
  workspace, webhookUrl, maskedTokens, showTokens, setShowTokens,
  copiedField, copyToClipboard, openAccordion, setOpenAccordion, saving, handleSave,
}: any) {
  return (
    <div className="space-y-4">
      {/* Webhook URL Card */}
      <div className="rounded-xl bg-zinc-900/60 backdrop-blur-md border border-white/10 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-white flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Webhook URL
          </h3>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Auto-generated
          </span>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2.5 rounded-lg bg-zinc-800/80 border border-white/5 text-[11px] text-emerald-300 font-mono truncate">
            {webhookUrl}
          </code>
          <button
            onClick={() => copyToClipboard(webhookUrl, 'wa-webhook')}
            className="px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition text-emerald-400"
          >
            {copiedField === 'wa-webhook' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Verify Token Display */}
        <div className="mt-3">
          <p className="text-[10px] text-gray-500 mb-1">Verification Token</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-zinc-800/80 border border-white/5 text-[11px] text-amber-300 font-mono">
              {maskedTokens.whatsapp_verify_token || 'Not set yet'}
            </code>
          </div>
        </div>
      </div>

      {/* Credentials Form */}
      <form onSubmit={handleSave} className="rounded-xl bg-zinc-900/60 backdrop-blur-md border border-white/10 p-5 space-y-4">
        <h3 className="text-xs font-semibold text-white mb-3">WhatsApp Business API Credentials</h3>

        {/* Phone Number ID */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Phone Number ID</label>
          <div className="relative">
            <input
              name="whatsapp_phone_number_id"
              type={showTokens['wa_phone'] ? 'text' : 'password'}
              placeholder={maskedTokens.whatsapp_phone_number_id || 'Enter Phone Number ID'}
              className="w-full px-3 py-2.5 pr-10 rounded-lg bg-zinc-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600
                focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 outline-none transition font-mono"
            />
            <button
              type="button"
              onClick={() => setShowTokens((p: any) => ({ ...p, wa_phone: !p.wa_phone }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showTokens['wa_phone'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Access Token */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Access Token</label>
          <div className="relative">
            <input
              name="whatsapp_access_token"
              type={showTokens['wa_token'] ? 'text' : 'password'}
              placeholder={maskedTokens.whatsapp_access_token || 'Enter Access Token'}
              className="w-full px-3 py-2.5 pr-10 rounded-lg bg-zinc-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600
                focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 outline-none transition font-mono"
            />
            <button
              type="button"
              onClick={() => setShowTokens((p: any) => ({ ...p, wa_token: !p.wa_token }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showTokens['wa_token'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Verify Token */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Verify Token</label>
          <input
            name="whatsapp_verify_token"
            type="text"
            placeholder={maskedTokens.whatsapp_verify_token || 'Choose a verification token'}
            className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600
              focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 outline-none transition font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600
            hover:from-emerald-400 hover:to-green-500 disabled:opacity-50 shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
          Encrypt & Save
        </button>
      </form>

      {/* Setup Guide Accordions */}
      <div className="space-y-2">
        <SetupAccordion
          id="wa-step1"
          title="Step 1: Create a Meta App"
          openAccordion={openAccordion}
          setOpenAccordion={setOpenAccordion}
        >
          <ol className="list-decimal list-inside space-y-2 text-xs text-gray-400">
            <li>Go to <a href="https://developers.facebook.com" target="_blank" className="text-emerald-400 underline inline-flex items-center gap-1">developers.facebook.com <ExternalLink className="w-3 h-3" /></a></li>
            <li>Click <strong className="text-white">Create App</strong> → select the <strong className="text-white">&quot;Other&quot;</strong> use case, then select <strong className="text-white">&quot;Business&quot;</strong> as the app type</li>
            <li>Give your app a name and connect it to your Meta Business Account</li>
            <li>Once created, click <strong className="text-white">Add Product</strong> on the left sidebar and select <strong className="text-white">WhatsApp</strong></li>
            <li>Navigate to <strong className="text-white">WhatsApp → API Setup</strong> to find your <strong className="text-white">Phone Number ID</strong> and <strong className="text-white">Temporary Access Token</strong></li>
          </ol>
        </SetupAccordion>

        <SetupAccordion
          id="wa-step2"
          title="Step 2: Configure Webhook in Meta Portal"
          openAccordion={openAccordion}
          setOpenAccordion={setOpenAccordion}
        >
          <ol className="list-decimal list-inside space-y-2 text-xs text-gray-400">
            <li>In your Meta App, go to <strong className="text-white">WhatsApp → Configuration</strong></li>
            <li>Click <strong className="text-white">Edit</strong> under Webhook</li>
            <li>Paste your webhook URL from above as the <strong className="text-white">Callback URL</strong></li>
            <li>Enter your chosen <strong className="text-white">Verify Token</strong> (same as the one you saved above)</li>
            <li>Subscribe to the <code className="text-emerald-400">messages</code> webhook field</li>
          </ol>
        </SetupAccordion>

        <SetupAccordion
          id="wa-step3"
          title="Step 3: Test Mode vs. Production"
          openAccordion={openAccordion}
          setOpenAccordion={setOpenAccordion}
        >
          <ol className="list-decimal list-inside space-y-2 text-xs text-gray-400">
            <li>By default, your app is in <strong className="text-white">Development</strong> mode and can only send messages to <strong className="text-amber-400">5 verified test numbers</strong></li>
            <li>Add test numbers in <strong className="text-white">WhatsApp → API Setup → &quot;To&quot;</strong> field — each must verify via SMS code</li>
            <li>To go live for production, you must:
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-gray-500">
                <li>Complete <strong className="text-white">Meta Business Verification</strong> (upload business documents)</li>
                <li>Add a <strong className="text-white">real phone number</strong> (not the test number Meta provides)</li>
                <li>Toggle the app switch at the top of the Meta dashboard from <strong className="text-amber-400">Development</strong> to <strong className="text-emerald-400">Live</strong></li>
              </ul>
            </li>
          </ol>
        </SetupAccordion>

        <SetupAccordion
          id="wa-step4"
          title="Step 4: Generate a Permanent Access Token"
          openAccordion={openAccordion}
          setOpenAccordion={setOpenAccordion}
        >
          <div className="space-y-3">
            <div className="bg-amber-950/30 border border-amber-500/20 rounded-lg px-3 py-2">
              <p className="text-[10px] text-amber-400">⚠️ The default token from API Setup expires in <strong>24 hours</strong>. Follow these steps to create a permanent one.</p>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-xs text-gray-400">
              <li>Go to <a href="https://business.facebook.com/settings/system-users" target="_blank" className="text-emerald-400 underline inline-flex items-center gap-1">Meta Business Settings → System Users <ExternalLink className="w-3 h-3" /></a></li>
              <li>Click <strong className="text-white">Add</strong> to create a new System User (name it e.g. &quot;WhatsApp API Bot&quot;)</li>
              <li>Set the role to <strong className="text-white">Admin</strong></li>
              <li>Click <strong className="text-white">Add Assets</strong> → select <strong className="text-white">Apps</strong> → choose your WhatsApp app → grant <strong className="text-white">Full Control</strong></li>
              <li>Click <strong className="text-white">Generate New Token</strong> → select your app → check the <code className="text-emerald-400">whatsapp_business_messaging</code> and <code className="text-emerald-400">whatsapp_business_management</code> permissions</li>
              <li>Copy the generated token and paste it in the <strong className="text-white">Access Token</strong> field above</li>
              <li>This token <strong className="text-emerald-400">does not expire</strong> and is safe for production use</li>
            </ol>
          </div>
        </SetupAccordion>
      </div>
    </div>
  );
}

// --- Reusable Setup Accordion ---
function SetupAccordion({
  id, title, openAccordion, setOpenAccordion, children,
}: {
  id: string;
  title: string;
  openAccordion: string | null;
  setOpenAccordion: (id: string | null) => void;
  children: React.ReactNode;
}) {
  const isOpen = openAccordion === id;

  return (
    <div className="rounded-xl bg-zinc-900/40 border border-white/5 overflow-hidden">
      <button
        onClick={() => setOpenAccordion(isOpen ? null : id)}
        className="w-full flex items-center justify-between px-5 py-3 text-xs font-medium text-gray-300 hover:text-white transition"
      >
        {title}
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
