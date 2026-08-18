import { getEmailTemplates } from './actions';
import EmailsClient from './emails-client';

export default async function EmailsPage() {
  const { templates, error } = await getEmailTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Email Templates</h2>
          <p className="text-xs text-gray-500 mt-1">
            Manage transactional email templates. Use <code className="text-indigo-400">{`{{variable}}`}</code> placeholders for dynamic content.
          </p>
        </div>
        <span className="text-xs text-gray-500 font-mono">{templates.length} templates</span>
      </div>

      {error ? (
        <div className="p-4 text-center text-rose-400 text-sm bg-rose-950/20 border border-rose-900/30 rounded-lg">
          Failed to load templates: {error}
        </div>
      ) : (
        <EmailsClient templates={templates} />
      )}
    </div>
  );
}
