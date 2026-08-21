-- =========================================================================
-- Migration 034: Legal CMS & Verified Business Badges
-- Super Admin global legal templates + Tenant business policy toggles
-- =========================================================================

-- 1. Global Legal Content Table (Super Admin managed)
CREATE TABLE IF NOT EXISTS public.global_legal_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL CHECK (content_type IN ('terms_of_service', 'privacy_policy', 'disclaimer', 'cookie_policy')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(content_type, version)
);

COMMENT ON TABLE public.global_legal_content IS 'Platform-wide legal templates managed by Super Admin';
COMMENT ON COLUMN public.global_legal_content.content_type IS 'Type of legal document';
COMMENT ON COLUMN public.global_legal_content.last_generated_at IS 'Timestamp when AI auto-generated this content';

-- Trigger for updated_at
CREATE TRIGGER set_global_legal_content_updated_at
    BEFORE UPDATE ON public.global_legal_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: Only Super Admins can manage
ALTER TABLE public.global_legal_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access_legal" ON public.global_legal_content
    FOR ALL USING (public.get_my_role() = 'super_admin');

CREATE POLICY "anyone_read_active_legal" ON public.global_legal_content
    FOR SELECT USING (is_active = TRUE);

-- 2. Add verified_badge support to subscription_plans
ALTER TABLE public.subscription_plans
    ADD COLUMN IF NOT EXISTS has_verified_badge BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.subscription_plans.has_verified_badge IS 'Display verified checkmark on tenant SabiBio pages';

-- Grant verified badges to Pro tier and above
UPDATE public.subscription_plans 
SET has_verified_badge = TRUE 
WHERE slug IN ('pro', 'business', 'enterprise', 'unlimited');

-- 3. Extend workspaces with business policy toggles
ALTER TABLE public.workspaces
    ADD COLUMN IF NOT EXISTS show_business_terms BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS show_business_privacy BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS show_business_disclaimer BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS business_legal_content JSONB DEFAULT '{}'::JSONB;

COMMENT ON COLUMN public.workspaces.show_business_terms IS 'Toggle to display business-specific terms on SabiBio footer';
COMMENT ON COLUMN public.workspaces.show_business_privacy IS 'Toggle to display business-specific privacy policy';
COMMENT ON COLUMN public.workspaces.business_legal_content IS 'Business-customized legal text overrides';

-- 4. Seed default global legal templates (placeholder text for Super Admin to customize)
INSERT INTO public.global_legal_content (content_type, title, content, version) VALUES
(
    'terms_of_service',
    'Platform Terms of Service',
    E'# Terms of Service\n\n**Last Updated:** [DATE]\n\n## 1. Acceptance of Terms\nBy accessing and using this platform, you accept and agree to be bound by these Terms of Service.\n\n## 2. Service Description\nThis platform provides AI-powered customer engagement and business management tools.\n\n## 3. User Obligations\n- You must provide accurate information\n- You are responsible for maintaining account security\n- You must comply with all applicable laws\n\n## 4. Prohibited Conduct\n- Unauthorized access attempts\n- Distribution of malware\n- Harassment or abuse of other users\n\n## 5. Intellectual Property\nAll platform content and technology remain our exclusive property.\n\n## 6. Limitation of Liability\nThe platform is provided "as is" without warranties. We are not liable for indirect or consequential damages.\n\n## 7. Termination\nWe reserve the right to suspend or terminate accounts violating these terms.\n\n## 8. Changes to Terms\nWe may update these terms with notice to users.\n\n## 9. Governing Law\nThese terms are governed by applicable laws.\n\n## 10. Contact\nFor questions, contact: legal@sabiai.tech',
    '1.0'
),
(
    'privacy_policy',
    'Privacy Policy',
    E'# Privacy Policy\n\n**Last Updated:** [DATE]\n\n## 1. Information We Collect\n- Account information (name, email, business details)\n- Usage data and analytics\n- Communication content (for AI training)\n- Payment information (processed securely)\n\n## 2. How We Use Your Data\n- Provide and improve services\n- Process transactions\n- Send service notifications\n- Train AI models (anonymized)\n- Comply with legal obligations\n\n## 3. Data Sharing\n- We do not sell personal data\n- Third-party service providers (payment, hosting)\n- Legal requirements and protection of rights\n\n## 4. Data Security\n- Encryption in transit and at rest\n- Regular security audits\n- Access controls and monitoring\n\n## 5. Your Rights\n- Access your data\n- Request corrections\n- Request deletion (subject to legal obligations)\n- Opt-out of marketing communications\n\n## 6. Cookies\nWe use cookies for functionality and analytics. You can control cookie preferences.\n\n## 7. Data Retention\nData retained as long as account is active, plus legal retention periods.\n\n## 8. International Transfers\nData may be processed in multiple jurisdictions with appropriate safeguards.\n\n## 9. Updates\nWe notify users of material privacy policy changes.\n\n## 10. Contact\nPrivacy concerns: privacy@sabiai.tech',
    '1.0'
),
(
    'disclaimer',
    'Legal Disclaimer',
    E'# Disclaimer\n\n**Last Updated:** [DATE]\n\n## General Disclaimer\nThe information and services provided on this platform are for general informational purposes only.\n\n## AI-Generated Content\n- AI responses are automated and may contain inaccuracies\n- Content should not be considered professional advice\n- Users should verify critical information independently\n\n## Service Availability\n- Platform provided "as is" without uptime guarantees\n- Maintenance and updates may cause temporary interruptions\n- Third-party service dependencies may affect availability\n\n## Accuracy of Information\nWhile we strive for accuracy, we make no representations or warranties regarding:\n- Completeness of information\n- Reliability of AI responses\n- Suitability for specific purposes\n\n## Business Use Cases\n- Results may vary based on implementation\n- Platform is a tool, not a guarantee of business outcomes\n- Users responsible for compliance with industry regulations\n\n## Third-Party Links\n- Platform may contain links to external sites\n- We are not responsible for third-party content or policies\n\n## Limitation of Warranties\n- No warranty of merchantability or fitness for purpose\n- No guarantee of error-free or uninterrupted service\n\n## Indemnification\nUsers agree to indemnify platform against claims arising from their use of services.\n\n## Changes\nThis disclaimer may be updated without individual notice.\n\n## Contact\nQuestions: legal@sabiai.tech',
    '1.0'
),
(
    'cookie_policy',
    'Cookie Policy',
    E'# Cookie Policy\n\n**Last Updated:** [DATE]\n\n## What Are Cookies?\nCookies are small text files stored on your device to enhance your experience.\n\n## Types of Cookies We Use\n\n### Essential Cookies\n- Authentication and security\n- Session management\n- Platform functionality\n\n### Analytics Cookies\n- Usage patterns and statistics\n- Feature performance monitoring\n- Error tracking and debugging\n\n### Preference Cookies\n- Language and theme settings\n- UI customization preferences\n\n## Cookie Duration\n- Session cookies (deleted when browser closes)\n- Persistent cookies (defined expiration dates)\n\n## Third-Party Cookies\nWe use services that may set cookies:\n- Analytics providers (e.g., Google Analytics)\n- Payment processors\n- Infrastructure providers\n\n## Managing Cookies\nYou can control cookies through:\n- Browser settings\n- Our cookie consent banner\n- Third-party opt-out tools\n\n**Note:** Disabling essential cookies may impair platform functionality.\n\n## Data Collected\nCookies may track:\n- Pages visited\n- Time spent on site\n- Referral sources\n- Device and browser information\n\n## Cookie Updates\nThis policy may be updated as we adopt new technologies.\n\n## More Information\nFor cookie-related questions: privacy@sabiai.tech',
    '1.0'
)
ON CONFLICT (content_type, version) DO NOTHING;
