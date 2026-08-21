'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Copy, Check, Code } from 'lucide-react';

const PRESET_COLORS = ['#4f46e5', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

export default function WidgetPage() {
  const params = useParams<{ workspace_id: string }>();
  const workspaceId = params.workspace_id;
  const [buttonColor, setButtonColor] = useState('#4f46e5');
  const [copied, setCopied] = useState(false);

  const embedCode = `<script src="https://www.sabibio.link/widget.js" data-workspace-id="${workspaceId}" data-button-color="${buttonColor}" defer></script>`;

  function copyToClipboard() {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2"><Code className="h-5 w-5 text-indigo-400" /><h1 className="text-xl font-semibold text-white">Embed Chat Widget</h1></div>
        <p className="mt-1 text-xs text-gray-500">Add the chat widget to any website. Paste the code snippet into your site's &lt;head&gt; or &lt;body&gt;.</p>
      </div>

      {/* Setup Instructions */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">Getting Started</h2>
        <ol className="space-y-3 text-xs text-gray-400">
          <li><span className="font-bold text-white">1.</span> Customize the button color below (optional)</li>
          <li><span className="font-bold text-white">2.</span> Copy the embed code</li>
          <li><span className="font-bold text-white">3.</span> Paste it into your website's HTML, before the closing &lt;/body&gt; tag</li>
          <li><span className="font-bold text-white">4.</span> The chat widget will appear on your site immediately</li>
        </ol>
      </div>

      {/* Customization */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Button Color</h3>
        <div className="flex items-center gap-3 flex-wrap">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setButtonColor(color)}
              className={`w-10 h-10 rounded-lg border-2 transition ${
                buttonColor === color ? 'border-white' : 'border-white/20 hover:border-white/40'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          <div className="flex items-center gap-2 ml-4">
            <label className="text-xs text-gray-400">Or enter hex:</label>
            <input
              type="color"
              value={buttonColor}
              onChange={(e) => setButtonColor(e.target.value)}
              className="w-12 h-8 rounded border border-white/10 cursor-pointer"
            />
            <input
              type="text"
              value={buttonColor}
              onChange={(e) => setButtonColor(e.target.value)}
              className="px-2 py-1 rounded bg-zinc-800/50 border border-white/10 text-white text-xs font-mono w-24 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Embed Code */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Embed Code</h3>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold transition"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="p-4 rounded-lg bg-black/50 border border-white/5 text-gray-300 text-xs overflow-x-auto font-mono">
          {embedCode}
        </pre>
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Live Preview</h3>
        <p className="text-xs text-gray-500">The widget appears as a floating button on the bottom-right of your pages:</p>
        <div className="bg-linear-to-br from-slate-800 to-slate-900 rounded-lg p-8 min-h-64 relative">
          <div className="text-center text-gray-500 text-xs mb-4">Your website content goes here...</div>
          {/* Floating Button Preview */}
          <div className="absolute bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: buttonColor }}>
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
              <path d="M4 4h16a1 1 0 011 1v11a1 1 0 01-1 1H8l-4 4V6a1 1 0 011-1z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Testing */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Test the Widget</h3>
        <p className="text-xs text-gray-400">
          To test the embedded widget, create a simple HTML file with the embed code and open it in your browser. The chat will work from any domain thanks to CORS.
        </p>
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-300">
            <span className="font-semibold">Tip:</span> Use Python's built-in server to test locally:<br />
            <code className="font-mono">python -m http.server 8000</code>
          </p>
        </div>
      </div>
    </div>
  );
}
