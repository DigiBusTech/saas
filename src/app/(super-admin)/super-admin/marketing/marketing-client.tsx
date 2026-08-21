'use client';

import { useState, useTransition } from 'react';
import { Star, Plus, Edit2, Trash2, Eye, EyeOff, Award, Shield } from 'lucide-react';
import {
  createReview,
  updateReview,
  deleteReview,
  toggleReviewPublished,
  createPartner,
  updatePartner,
  deletePartner,
  togglePartnerActive,
} from './actions';

interface Review {
  id: string;
  author_name: string;
  author_title: string | null;
  company_name: string | null;
  review_text: string;
  rating: number;
  avatar_url: string | null;
  is_published: boolean;
  display_order: number;
}

interface Partner {
  id: string;
  entity_name: string;
  entity_type: string;
  logo_url: string;
  link_url: string | null;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

interface Props {
  initialReviews: Review[];
  initialPartners: Partner[];
}

export function MarketingClient({ initialReviews, initialPartners }: Props) {
  const [activeTab, setActiveTab] = useState<'reviews' | 'partners'>('reviews');
  const [reviews, setReviews] = useState(initialReviews);
  const [partners, setPartners] = useState(initialPartners);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleReviewSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = editingReview
        ? await updateReview(editingReview.id, formData)
        : await createReview(formData);
      
      if (result.error) {
        setError(result.error);
      } else {
        setShowReviewForm(false);
        setEditingReview(null);
        window.location.reload();
      }
    });
  };

  const handlePartnerSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = editingPartner
        ? await updatePartner(editingPartner.id, formData)
        : await createPartner(formData);
      
      if (result.error) {
        setError(result.error);
      } else {
        setShowPartnerForm(false);
        setEditingPartner(null);
        window.location.reload();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <Award className="h-5 w-5 text-cyan-400" />
          Marketing CMS
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Manage customer testimonials and trust badges displayed on the landing page
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'reviews'
              ? 'border-b-2 border-cyan-400 text-cyan-300'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Customer Reviews ({reviews.length})
        </button>
        <button
          onClick={() => setActiveTab('partners')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'partners'
              ? 'border-b-2 border-cyan-400 text-cyan-300'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Trust Badges ({partners.length})
        </button>
      </div>

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Testimonials displayed on the landing page social proof section
            </p>
            <button
              onClick={() => {
                setEditingReview(null);
                setShowReviewForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium text-white transition"
            >
              <Plus className="h-4 w-4" />
              Add Review
            </button>
          </div>

          {showReviewForm && (
            <form onSubmit={handleReviewSubmit} className="border border-gray-800 rounded-lg p-6 bg-gray-900/30 space-y-4">
              <h3 className="text-lg font-semibold text-white">
                {editingReview ? 'Edit Review' : 'New Review'}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Author Name *
                  </label>
                  <input
                    type="text"
                    name="author_name"
                    defaultValue={editingReview?.author_name}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Author Title
                  </label>
                  <input
                    type="text"
                    name="author_title"
                    defaultValue={editingReview?.author_title || ''}
                    placeholder="e.g., CEO, Operations Manager"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    defaultValue={editingReview?.company_name || ''}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Rating *
                  </label>
                  <select
                    name="rating"
                    defaultValue={editingReview?.rating || 5}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} Star{n !== 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Review Text *
                </label>
                <textarea
                  name="review_text"
                  defaultValue={editingReview?.review_text}
                  required
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Avatar URL (optional)
                  </label>
                  <input
                    type="url"
                    name="avatar_url"
                    defaultValue={editingReview?.avatar_url || ''}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    name="display_order"
                    defaultValue={editingReview?.display_order || 0}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_published"
                  value="true"
                  defaultChecked={editingReview?.is_published ?? true}
                  className="rounded"
                />
                <label className="text-sm text-gray-300">
                  Published (visible on landing page)
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium text-white transition disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : editingReview ? 'Update Review' : 'Create Review'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReviewForm(false);
                    setEditingReview(null);
                  }}
                  className="px-4 py-2 border border-gray-700 hover:bg-gray-800 rounded-lg text-sm text-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="grid gap-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border border-gray-800 rounded-lg p-4 bg-gray-900/20 hover:bg-gray-900/40 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{review.author_name}</span>
                          {review.is_published ? (
                            <span className="px-2 py-0.5 bg-emerald-950/50 text-emerald-400 border border-emerald-900/50 rounded text-[10px] font-medium">
                              PUBLISHED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-800 text-gray-400 border border-gray-700 rounded text-[10px] font-medium">
                              DRAFT
                            </span>
                          )}
                        </div>
                        {review.author_title && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {review.author_title}
                            {review.company_name && ` at ${review.company_name}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-300 mt-3 leading-relaxed">
                      "{review.review_text}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => {
                        startTransition(async () => {
                          await toggleReviewPublished(review.id, !review.is_published);
                          window.location.reload();
                        });
                      }}
                      className="p-2 hover:bg-gray-800 rounded-lg transition"
                      title={review.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {review.is_published ? (
                        <Eye className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingReview(review);
                        setShowReviewForm(true);
                      }}
                      className="p-2 hover:bg-gray-800 rounded-lg transition"
                    >
                      <Edit2 className="h-4 w-4 text-indigo-400" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this review?')) {
                          startTransition(async () => {
                            await deleteReview(review.id);
                            window.location.reload();
                          });
                        }
                      }}
                      className="p-2 hover:bg-gray-800 rounded-lg transition"
                    >
                      <Trash2 className="h-4 w-4 text-rose-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {reviews.length === 0 && (
              <div className="text-center py-12 text-gray-600">
                <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No reviews yet. Add your first customer testimonial.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Partners Tab */}
      {activeTab === 'partners' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Trust badges, compliance logos, and partner brands displayed on landing page
            </p>
            <button
              onClick={() => {
                setEditingPartner(null);
                setShowPartnerForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium text-white transition"
            >
              <Plus className="h-4 w-4" />
              Add Partner/Badge
            </button>
          </div>

          {showPartnerForm && (
            <form onSubmit={handlePartnerSubmit} className="border border-gray-800 rounded-lg p-6 bg-gray-900/30 space-y-4">
              <h3 className="text-lg font-semibold text-white">
                {editingPartner ? 'Edit Partner/Badge' : 'New Partner/Badge'}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Entity Name *
                  </label>
                  <input
                    type="text"
                    name="entity_name"
                    defaultValue={editingPartner?.entity_name}
                    required
                    placeholder="e.g., NDPC Compliant"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Type *
                  </label>
                  <select
                    name="entity_type"
                    defaultValue={editingPartner?.entity_type || 'partner'}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  >
                    <option value="partner">Partner</option>
                    <option value="compliance">Compliance</option>
                    <option value="certification">Certification</option>
                    <option value="integration">Integration</option>
                    <option value="media">Media</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Logo URL *
                </label>
                <input
                  type="url"
                  name="logo_url"
                  defaultValue={editingPartner?.logo_url}
                  required
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Link URL (optional)
                </label>
                <input
                  type="url"
                  name="link_url"
                  defaultValue={editingPartner?.link_url || ''}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  defaultValue={editingPartner?.description || ''}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  name="display_order"
                  defaultValue={editingPartner?.display_order || 0}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  value="true"
                  defaultChecked={editingPartner?.is_active ?? true}
                  className="rounded"
                />
                <label className="text-sm text-gray-300">
                  Active (visible on landing page)
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium text-white transition disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : editingPartner ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPartnerForm(false);
                    setEditingPartner(null);
                  }}
                  className="px-4 py-2 border border-gray-700 hover:bg-gray-800 rounded-lg text-sm text-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="grid gap-4">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className="border border-gray-800 rounded-lg p-4 bg-gray-900/20 hover:bg-gray-900/40 transition flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-24 h-12 bg-gray-800 rounded flex items-center justify-center overflow-hidden">
                    <img
                      src={partner.logo_url}
                      alt={partner.entity_name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{partner.entity_name}</span>
                      <span className="px-2 py-0.5 bg-gray-800 text-gray-400 border border-gray-700 rounded text-[10px] font-medium uppercase">
                        {partner.entity_type}
                      </span>
                      {partner.is_active ? (
                        <span className="px-2 py-0.5 bg-emerald-950/50 text-emerald-400 border border-emerald-900/50 rounded text-[10px] font-medium">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-800 text-gray-400 border border-gray-700 rounded text-[10px] font-medium">
                          INACTIVE
                        </span>
                      )}
                    </div>
                    {partner.description && (
                      <p className="text-xs text-gray-400 mt-1">{partner.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      startTransition(async () => {
                        await togglePartnerActive(partner.id, !partner.is_active);
                        window.location.reload();
                      });
                    }}
                    className="p-2 hover:bg-gray-800 rounded-lg transition"
                    title={partner.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {partner.is_active ? (
                      <Eye className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditingPartner(partner);
                      setShowPartnerForm(true);
                    }}
                    className="p-2 hover:bg-gray-800 rounded-lg transition"
                  >
                    <Edit2 className="h-4 w-4 text-indigo-400" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this partner/badge?')) {
                        startTransition(async () => {
                          await deletePartner(partner.id);
                          window.location.reload();
                        });
                      }
                    }}
                    className="p-2 hover:bg-gray-800 rounded-lg transition"
                  >
                    <Trash2 className="h-4 w-4 text-rose-400" />
                  </button>
                </div>
              </div>
            ))}

            {partners.length === 0 && (
              <div className="text-center py-12 text-gray-600">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No trust badges yet. Add compliance logos or partner brands.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
