import { Star } from 'lucide-react';

interface Review {
  id: string;
  author_name: string;
  author_title: string | null;
  company_name: string | null;
  review_text: string;
  rating: number;
  avatar_url: string | null;
}

interface Props {
  reviews: Review[];
}

export function TestimonialsSection({ reviews }: Props) {
  if (reviews.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
          Real results from Nigerian businesses
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Trusted by businesses across Nigeria.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400">
          From solo entrepreneurs to growing teams, SabiBio helps Nigerian businesses stay connected with their customers 24/7.
        </p>
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <article
            key={review.id}
            className="rounded-2xl border border-white/5 bg-white/2 p-6 transition hover:border-cyan-400/20 hover:bg-white/4"
          >
            {/* Star Rating */}
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < review.rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Review Text */}
            <blockquote className="mt-4 text-sm leading-7 text-slate-300">
              "{review.review_text}"
            </blockquote>

            {/* Author Info */}
            <div className="mt-6 flex items-center gap-3">
              {review.avatar_url ? (
                <img
                  src={review.avatar_url}
                  alt={review.author_name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 text-lg font-bold text-cyan-300">
                  {review.author_name[0]}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-white">
                  {review.author_name}
                </p>
                {(review.author_title || review.company_name) && (
                  <p className="text-xs text-slate-400">
                    {review.author_title}
                    {review.author_title && review.company_name && ', '}
                    {review.company_name}
                  </p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
