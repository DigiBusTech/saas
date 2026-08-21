'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FeatureGuide, FormInput, Tooltip } from '@/components/ui/guidance-components';
import { getGlobalSiteSettings, updateSEOSettings, updateBrandingAssets } from '@/lib/global-settings';
import type { GlobalSiteSettings } from '@/lib/global-settings';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

export default function GlobalSettingsPage() {
  const [settings, setSettings] = useState<GlobalSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'seo' | 'branding'>('seo');

  // SEO Form State
  const [seoForm, setSeoForm] = useState({
    site_title: '',
    meta_description: '',
    seo_keywords: [] as string[],
  });

  // Branding Form State
  const [brandingForm, setBrandingForm] = useState({
    universal_logo_url: '',
    universal_favicon_url: '',
    og_image_url: '',
  });

  const [keywordInput, setKeywordInput] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      const data = await getGlobalSiteSettings();
      if (data) {
        setSettings(data);
        setSeoForm({
          site_title: data.site_title,
          meta_description: data.meta_description,
          seo_keywords: data.seo_keywords || [],
        });
        setBrandingForm({
          universal_logo_url: data.universal_logo_url || '',
          universal_favicon_url: data.universal_favicon_url || '',
          og_image_url: data.og_image_url || '',
        });
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  const handleAddKeyword = () => {
    if (keywordInput.trim() && seoForm.seo_keywords.length < 20) {
      setSeoForm({
        ...seoForm,
        seo_keywords: [...seoForm.seo_keywords, keywordInput.trim()],
      });
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setSeoForm({
      ...seoForm,
      seo_keywords: seoForm.seo_keywords.filter((_, i) => i !== index),
    });
  };

  const handleSaveSEO = async () => {
    setSaving(true);
    try {
      const result = await updateSEOSettings(seoForm);
      if (result.success) {
        setSettings(result.data!);
        setMessage({ type: 'success', text: 'SEO settings updated successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save SEO settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    setSaving(true);
    try {
      const result = await updateBrandingAssets(brandingForm);
      if (result.success) {
        setSettings(result.data!);
        setMessage({ type: 'success', text: 'Branding assets updated successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save branding assets' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Global Site Settings
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Manage SEO, branding assets, and social preview settings for the entire platform
        </p>
      </motion.div>

      {/* Message Alert */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`mb-6 p-4 rounded-lg border flex items-center gap-3 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {message.text}
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div variants={itemVariants} className="mb-8 flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('seo')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-all duration-200 ${
            activeTab === 'seo'
              ? 'text-cyan-600 dark:text-cyan-400 border-cyan-600 dark:border-cyan-400'
              : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          🔍 SEO & Meta Tags
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-all duration-200 ${
            activeTab === 'branding'
              ? 'text-cyan-600 dark:text-cyan-400 border-cyan-600 dark:border-cyan-400'
              : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          🎨 Branding Assets
        </button>
      </motion.div>

      {/* SEO Tab */}
      {activeTab === 'seo' && (
        <motion.div
          variants={itemVariants}
          className="space-y-6"
        >
          <FeatureGuide
            title="SEO & Meta Tags Management"
            description="Update site title, meta description, and SEO keywords that appear in search engines and social media previews. These settings affect how your platform appears across Google, WhatsApp, LinkedIn, Twitter, and other services."
            icon={
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2 1 1 0 010 2H4a1 1 0 000 2h2a1 1 0 100-2 1 1 0 010-2 2 2 0 00-2-2zm9 7a4 4 0 11-8 0 4 4 0 018 0zm-4-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
            }
          />

          {/* SEO Cards */}
          <div className="grid gap-6">
            {/* Site Title Card */}
            <motion.div
              variants={itemVariants}
              className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  Site Title
                  <Tooltip content="This appears in browser tabs and search engine results">
                    <svg className="w-4 h-4 text-slate-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </Tooltip>
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {seoForm.site_title.length}/200
                </span>
              </div>
              <FormInput
                placeholder="e.g., SabiBio | AI Customer Operations"
                value={seoForm.site_title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSeoForm({ ...seoForm, site_title: e.target.value.slice(0, 200) })
                }
                helperText="Recommended length: 50-60 characters for optimal display"
              />
            </motion.div>

            {/* Meta Description Card */}
            <motion.div
              variants={itemVariants}
              className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  Meta Description
                  <Tooltip content="Shown below the title in search results and social media">
                    <svg className="w-4 h-4 text-slate-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </Tooltip>
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {seoForm.meta_description.length}/300
                </span>
              </div>
              <textarea
                placeholder="e.g., AI-assisted customer conversations, CRM, and automation for WhatsApp and Telegram."
                value={seoForm.meta_description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setSeoForm({ ...seoForm, meta_description: e.target.value.slice(0, 300) })
                }
                maxLength={300}
                rows={3}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 resize-none"
              />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Recommended length: 150-160 characters
              </p>
            </motion.div>

            {/* SEO Keywords Card */}
            <motion.div
              variants={itemVariants}
              className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  SEO Keywords
                  <Tooltip content="Tags that help search engines understand your content">
                    <svg className="w-4 h-4 text-slate-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </Tooltip>
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {seoForm.seo_keywords.length}/20
                </span>
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Add keyword..."
                  value={keywordInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeywordInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddKeyword();
                      e.preventDefault();
                    }
                  }}
                  className="flex-1 px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                />
                <button
                  onClick={handleAddKeyword}
                  disabled={seoForm.seo_keywords.length >= 20 || !keywordInput.trim()}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 disabled:dark:bg-slate-700 text-white rounded-lg font-medium transition-all duration-200 shrink-0"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {seoForm.seo_keywords.map((keyword, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 text-sm rounded-full border border-cyan-200 dark:border-cyan-500/30"
                  >
                    {keyword}
                    <button
                      onClick={() => handleRemoveKeyword(index)}
                      className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-200 transition-colors"
                    >
                      ×
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Save Button */}
          <motion.div variants={itemVariants} className="flex gap-3 pt-4">
            <button
              onClick={handleSaveSEO}
              disabled={saving}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 disabled:dark:bg-slate-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-cyan-600/30 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 5a2 2 0 012-2h6a1 1 0 100 2H6v12h8v-2a1 1 0 112 0v3a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                    <path d="M14 7l-4 4m0 0l4 4m-4-4h9" />
                  </svg>
                  Save SEO Settings
                </>
              )}
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Branding Tab */}
      {activeTab === 'branding' && (
        <motion.div
          variants={itemVariants}
          className="space-y-6"
        >
          <FeatureGuide
            title="Branding Assets"
            description="Upload or set URLs for your logo, favicon, and Open Graph image. These assets appear in browser tabs, WhatsApp previews, social media shares, and emails."
            icon={
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
              </svg>
            }
          />

          {/* Branding Cards */}
          <div className="grid gap-6">
            {/* Logo Card */}
            <motion.div
              variants={itemVariants}
              className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                Universal Logo
                <Tooltip content="SVG or PNG logo used across the platform">
                  <svg className="w-4 h-4 text-slate-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </Tooltip>
              </h3>
              <FormInput
                placeholder="https://cdn.example.com/logo.svg"
                value={brandingForm.universal_logo_url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setBrandingForm({ ...brandingForm, universal_logo_url: e.target.value })
                }
                helperText="Enter the full URL to your logo. Use SVG for best quality."
              />
              {brandingForm.universal_logo_url && (
                <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Preview:</p>
                  <img
                    src={brandingForm.universal_logo_url}
                    alt="Logo preview"
                    className="h-12 object-contain"
                    onError={() => (
                      <p className="text-xs text-rose-600">Error loading image</p>
                    )}
                  />
                </div>
              )}
            </motion.div>

            {/* Favicon Card */}
            <motion.div
              variants={itemVariants}
              className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                Favicon
                <Tooltip content="Icon shown in browser tab (ICO or PNG format)">
                  <svg className="w-4 h-4 text-slate-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </Tooltip>
              </h3>
              <FormInput
                placeholder="https://cdn.example.com/favicon.ico"
                value={brandingForm.universal_favicon_url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setBrandingForm({ ...brandingForm, universal_favicon_url: e.target.value })
                }
                helperText="Recommended size: 32x32 or 64x64 pixels"
              />
              {brandingForm.universal_favicon_url && (
                <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Preview:</p>
                  <img
                    src={brandingForm.universal_favicon_url}
                    alt="Favicon preview"
                    className="h-8 w-8 object-contain"
                  />
                </div>
              )}
            </motion.div>

            {/* OG Image Card */}
            <motion.div
              variants={itemVariants}
              className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                Open Graph Image
                <Tooltip content="Image shown when the link is shared on WhatsApp, LinkedIn, Twitter, etc.">
                  <svg className="w-4 h-4 text-slate-400 cursor-help" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </Tooltip>
              </h3>
              <FormInput
                placeholder="https://cdn.example.com/og-image.png"
                value={brandingForm.og_image_url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setBrandingForm({ ...brandingForm, og_image_url: e.target.value })
                }
                helperText="Recommended size: 1200x630 pixels. Appears in social media previews."
              />
              {brandingForm.og_image_url && (
                <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Preview:</p>
                  <img
                    src={brandingForm.og_image_url}
                    alt="OG image preview"
                    className="max-h-40 object-cover rounded"
                  />
                </div>
              )}
            </motion.div>

            {/* Live Preview Card */}
            <motion.div
              variants={itemVariants}
              className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                📱 Live Open Graph Preview
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                This is how your link will appear when shared on social media:
              </p>

              <div className="space-y-4">
                {/* WhatsApp Preview */}
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                    WhatsApp / Telegram
                  </p>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700 space-y-2">
                    {brandingForm.og_image_url && (
                      <img
                        src={brandingForm.og_image_url}
                        alt="Preview"
                        className="w-full max-h-32 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {seoForm.site_title || 'SabiBio'}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {seoForm.meta_description || 'AI-assisted customer operations'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* LinkedIn Preview */}
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                    LinkedIn / Twitter
                  </p>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-700">
                    <div className="flex gap-3">
                      {brandingForm.og_image_url && (
                        <img
                          src={brandingForm.og_image_url}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {seoForm.site_title || 'SabiBio'}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                          {seoForm.meta_description || 'AI-assisted customer operations'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                          www.sabibio.link
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Save Button */}
          <motion.div variants={itemVariants} className="flex gap-3 pt-4">
            <button
              onClick={handleSaveBranding}
              disabled={saving}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-300 disabled:dark:bg-slate-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-cyan-600/30 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 5a2 2 0 012-2h6a1 1 0 100 2H6v12h8v-2a1 1 0 112 0v3a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                    <path d="M14 7l-4 4m0 0l4 4m-4-4h9" />
                  </svg>
                  Save Branding Assets
                </>
              )}
            </button>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
