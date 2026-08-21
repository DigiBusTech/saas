// =========================================================================
// PHASE 1 ENHANCEMENTS: SabiBio Builder Legal Tab Enhancement
// Add this enhanced Legal component to SabiBioBuilder.tsx
// =========================================================================

/**
 * PHASE 1: Enhanced Legal Tab Component
 * Features:
 * - Business policy toggles (Terms, Privacy, Disclaimer)
 * - Workspace name context for tenant branding
 * - Cookie consent toggle
 * - Improved UX with help text
 */
function Legal({ workspaceName, legal, change }: { 
  workspaceName: string; 
  legal: Record<string, any>; 
  change: (key: string, value: unknown) => void 
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Business Legal Policies</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Customize legal footer content for {workspaceName}. These will display at the bottom of your SabiBio page with your business name.
        </p>
      </div>

      {/* Business Policy Toggles */}
      <div className="space-y-3">
        <label className="flex items-start gap-3 rounded-xl border border-border p-4">
          <input
            type="checkbox"
            checked={Boolean(legal.show_terms)}
            onChange={(e) => change('show_terms', e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-cyan-500"
          />
          <div className="flex-1">
            <span className="text-xs font-medium text-foreground">Terms of Service</span>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Show terms of service link in footer (e.g., "{workspaceName} Terms of Service")
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-border p-4">
          <input
            type="checkbox"
            checked={Boolean(legal.show_privacy)}
            onChange={(e) => change('show_privacy', e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-cyan-500"
          />
          <div className="flex-1">
            <span className="text-xs font-medium text-foreground">Privacy Policy</span>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Show privacy policy link in footer
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-border p-4">
          <input
            type="checkbox"
            checked={Boolean(legal.show_disclaimer)}
            onChange={(e) => change('show_disclaimer', e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-cyan-500"
          />
          <div className="flex-1">
            <span className="text-xs font-medium text-foreground">Legal Disclaimer</span>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Show disclaimer about AI-generated content and liability
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-border p-4">
          <input
            type="checkbox"
            checked={Boolean(legal.cookie_consent_required)}
            onChange={(e) => change('cookie_consent_required', e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-cyan-500"
          />
          <div className="flex-1">
            <span className="text-xs font-medium text-foreground">Cookie Consent Banner</span>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Show cookie consent popup for GDPR/CCPA compliance
            </p>
          </div>
        </label>
      </div>

      {/* Custom Legal Content */}
      <div className="space-y-4">
        <div>
          <label className="block">
            <span className="text-xs font-medium text-gray-400">Custom Terms (Optional)</span>
            <p className="mt-1 mb-2 text-[10px] text-muted-foreground">
              Add business-specific terms. If blank, platform defaults will be used.
            </p>
            <textarea
              value={String(legal.terms_of_service ?? '')}
              onChange={(e) => change('terms_of_service', e.target.value)}
              placeholder="Enter custom terms or leave blank to use platform defaults..."
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-xs text-foreground focus:border-cyan-500 focus:outline-none resize-none"
            />
          </label>
        </div>

        <div>
          <label className="block">
            <span className="text-xs font-medium text-gray-400">Custom Privacy Policy (Optional)</span>
            <textarea
              value={String(legal.privacy_policy ?? '')}
              onChange={(e) => change('privacy_policy', e.target.value)}
              placeholder="Enter custom privacy policy..."
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-xs text-foreground focus:border-cyan-500 focus:outline-none resize-none"
            />
          </label>
        </div>

        <div>
          <label className="block">
            <span className="text-xs font-medium text-gray-400">Custom Disclaimer (Optional)</span>
            <textarea
              value={String(legal.disclaimer ?? '')}
              onChange={(e) => change('disclaimer', e.target.value)}
              placeholder="Enter custom disclaimer..."
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-xs text-foreground focus:border-cyan-500 focus:outline-none resize-none"
            />
          </label>
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 p-4">
        <p className="text-[10px] text-muted-foreground">
          💡 <strong>Tip:</strong> Legal content will display as "{workspaceName} Privacy Policy", "{workspaceName} Terms", etc. in your SabiBio footer. This helps establish trust and brand identity.
        </p>
      </div>
    </div>
  );
}

// =========================================================================
// INSTRUCTION: Add "Preview Business Page" Link
// =========================================================================
// In the main return statement, add this after the <h1> tag:
/*
  {config.sabibio_enabled && config.slug && (
    <a 
      href={`${typeof window !== 'undefined' ? window.location.origin : ''}/${config.slug}`}
      target="_blank" 
      rel="noreferrer" 
      className="mt-2 inline-flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
    >
      <Eye className="h-3.5 w-3.5" /> 
      Preview: {config.slug}
    </a>
  )}
*/

// =========================================================================
// INSTRUCTION: Update Legal Tab Render
// =========================================================================
// Change from:
// {tab === 'legal' && <Legal legal={config.sabibio_legal} change={...} />}
//
// To:
// {tab === 'legal' && <Legal workspaceName={workspace.name} legal={config.sabibio_legal} change={(key, value) => patch({ sabibio_legal: { ...config.sabibio_legal, [key]: value } })} />}
