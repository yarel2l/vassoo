-- ============================================
-- Migration: 026_page_content
-- Description: CMS for footer pages content management
-- ============================================

-- ============================================
-- PAGE CONTENT TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.page_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Page identification
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,

    -- Content
    content TEXT NOT NULL DEFAULT '',
    excerpt TEXT,

    -- Categorization (maps to footer columns)
    category TEXT NOT NULL CHECK (category IN ('about', 'support', 'legal')),

    -- SEO
    meta_title TEXT,
    meta_description TEXT,

    -- Status
    is_published BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,

    -- Author tracking
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_page_content_slug ON page_content(slug);
CREATE INDEX idx_page_content_category ON page_content(category);
CREATE INDEX idx_page_content_published ON page_content(is_published) WHERE is_published = TRUE;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_page_content_updated_at
    BEFORE UPDATE ON page_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;

-- Public can read published content
CREATE POLICY "Public can view published pages"
    ON page_content FOR SELECT
    USING (is_published = TRUE);

-- Platform admins can do everything
CREATE POLICY "Platform admins have full access to pages"
    ON page_content FOR ALL
    USING (is_platform_admin());

-- ============================================
-- SEED DATA - Default pages
-- ============================================

INSERT INTO page_content (slug, title, category, content, is_published) VALUES
-- About Us pages
('about/who-we-are', 'Who We Are', 'about',
'# Who We Are

Welcome to our premium beverage marketplace. We are dedicated to bringing you the finest selection of spirits, wines, and liquors from trusted vendors across the region.

## Our Story

Founded with a passion for quality beverages, we have grown to become a trusted platform connecting discerning customers with reputable stores.

## Our Values

- **Quality**: We partner only with verified, licensed retailers
- **Convenience**: Shop from multiple stores in one place
- **Trust**: Secure payments and reliable delivery
- **Selection**: Extensive catalog of premium beverages', TRUE),

('about/our-mission', 'Our Mission', 'about',
'# Our Mission

Our mission is to revolutionize how you discover and purchase premium beverages by creating a seamless marketplace that connects you with the best local and national retailers.

## What We Believe

We believe everyone deserves access to quality spirits, exceptional service, and competitive prices. Our platform makes this possible by:

- Aggregating inventory from multiple trusted vendors
- Providing transparent pricing and delivery options
- Ensuring age verification and responsible sales
- Supporting local businesses and communities', TRUE),

('about/location-hours', 'Location & Hours', 'about',
'# Location & Hours

## Contact Us

Our customer support team is available to assist you with any questions or concerns.

**Customer Support Hours:**
- Monday - Friday: 9:00 AM - 8:00 PM EST
- Saturday: 10:00 AM - 6:00 PM EST
- Sunday: 12:00 PM - 5:00 PM EST

**Delivery Hours:**
Delivery times vary by store and location. Please check individual store pages for their specific delivery schedules.

## Headquarters

Contact information can be found in our footer or contact page.', TRUE),

('about/work-with-us', 'Work With Us', 'about',
'# Work With Us

## Join Our Team

We are always looking for talented individuals to join our growing team. Check back for current openings.

## Become a Partner Store

Are you a licensed retailer looking to expand your reach? Partner with us to:

- Access a larger customer base
- Benefit from our marketing and technology platform
- Streamline your delivery operations
- Grow your business with data-driven insights

Contact us to learn more about partnership opportunities.

## Delivery Partners

We work with professional delivery services to ensure safe, timely delivery of orders. If you are interested in becoming a delivery partner, please reach out to our partnerships team.', TRUE),

-- Customer Support pages
('support/faq', 'Frequently Asked Questions', 'support',
'# Frequently Asked Questions

## Orders & Delivery

**How long does delivery take?**
Delivery times vary by store and location. Most orders are delivered within 1-3 business days. Express delivery may be available in select areas.

**Can I track my order?**
Yes! Once your order is shipped, you will receive a tracking number via email.

**What if my order arrives damaged?**
Contact our support team immediately with photos of the damage. We will arrange a replacement or refund.

## Payments

**What payment methods do you accept?**
We accept all major credit cards, debit cards, and select digital wallets.

**Is my payment information secure?**
Yes, we use industry-standard encryption and never store your full card details.

## Account

**How do I create an account?**
Click "Sign Up" and follow the prompts. You will need to verify your age to complete registration.

**I forgot my password. What do I do?**
Click "Forgot Password" on the login page and follow the instructions sent to your email.', TRUE),

('support/shipping-delivery', 'Shipping & Delivery', 'support',
'# Shipping & Delivery

## Delivery Options

Delivery options vary by store and your location. Available options may include:

- **Standard Delivery**: 2-5 business days
- **Express Delivery**: Same-day or next-day (where available)
- **Scheduled Delivery**: Choose a specific date and time window

## Delivery Fees

Delivery fees are calculated based on:
- Distance from the store
- Order total (free delivery thresholds may apply)
- Delivery speed selected

## Delivery Requirements

- Someone 21+ must be present to receive alcohol deliveries
- Valid ID will be checked upon delivery
- Signature may be required

## Delivery Areas

We currently deliver to select areas. Enter your address at checkout to confirm availability.', TRUE),

('support/payment-methods-info', 'Payment Methods', 'support',
'# Payment Methods

## Accepted Payment Methods

We accept the following payment methods:

- **Credit Cards**: Visa, Mastercard, American Express, Discover
- **Debit Cards**: With Visa or Mastercard logo
- **Digital Wallets**: Apple Pay, Google Pay (where available)

## Payment Security

Your payment information is protected by:

- 256-bit SSL encryption
- PCI DSS compliance
- Secure tokenization (we never store full card numbers)

## Billing

- Your card will be charged when your order is confirmed
- For split orders from multiple stores, you may see multiple charges
- Refunds are processed to the original payment method within 5-10 business days', TRUE),

('support/order-tracking', 'Order Tracking', 'support',
'# Order Tracking

## How to Track Your Order

1. **Email Notifications**: You will receive tracking updates via email
2. **Account Dashboard**: Log in to view all your orders and their status
3. **Tracking Link**: Click the tracking link in your confirmation email

## Order Statuses

- **Pending**: Order received, awaiting confirmation
- **Confirmed**: Order confirmed by the store
- **Preparing**: Store is preparing your order
- **Out for Delivery**: Your order is on its way
- **Delivered**: Order has been delivered
- **Cancelled**: Order was cancelled

## Issues with Your Order?

If you experience any issues with tracking or delivery, please contact our support team with your order number.', TRUE),

('support/contact', 'Contact Us', 'support',
'# Contact Us

## Get in Touch

We are here to help! Choose the best way to reach us:

### Customer Support

For order inquiries, delivery issues, or general questions:
- Check our FAQ first for quick answers
- Email: support@example.com
- Response time: Within 24 hours

### Business Inquiries

For partnership, vendor, or business-related inquiries:
- Email: partners@example.com

### Report an Issue

If you need to report a problem with a product or service:
- Email: feedback@example.com
- Please include your order number and detailed description

## Response Times

We aim to respond to all inquiries within 24 hours during business days.', TRUE),

-- Legal & Compliance pages
('legal/privacy-policy', 'Privacy Policy', 'legal',
'# Privacy Policy

*Last updated: January 2025*

## Introduction

This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.

## Information We Collect

### Personal Information
- Name and contact information
- Date of birth (for age verification)
- Delivery address
- Payment information

### Usage Information
- Browser type and device information
- Pages visited and features used
- Search queries and preferences

## How We Use Your Information

- Process and deliver orders
- Verify age for alcohol purchases
- Improve our services
- Send transactional communications
- Marketing (with your consent)

## Data Security

We implement appropriate security measures to protect your personal information.

## Your Rights

You have the right to access, correct, or delete your personal information. Contact us to exercise these rights.', TRUE),

('legal/terms-conditions', 'Terms & Conditions', 'legal',
'# Terms & Conditions

*Last updated: January 2025*

## Agreement to Terms

By accessing our platform, you agree to these Terms and Conditions.

## Eligibility

You must be at least 21 years old to purchase alcohol through our platform. Age verification is required.

## Account Responsibilities

- Provide accurate information
- Maintain account security
- Report unauthorized access

## Orders and Payments

- All orders are subject to acceptance and availability
- Prices may vary by store and location
- Payment is required at time of order

## Delivery

- Valid ID required for alcohol delivery
- Someone 21+ must be present to receive orders
- We reserve the right to refuse delivery

## Limitation of Liability

We are not liable for damages arising from use of our platform beyond what is required by law.

## Governing Law

These terms are governed by applicable state and federal laws.', TRUE),

('legal/returns-refunds', 'Returns & Refunds Policy', 'legal',
'# Returns & Refunds Policy

## Return Eligibility

Due to the nature of alcohol products, returns are limited to:

- Damaged products (reported within 24 hours of delivery)
- Incorrect items received
- Quality issues with sealed products

## How to Request a Return

1. Contact customer support within 24 hours of delivery
2. Provide photos of the issue
3. Do not dispose of the product until instructed

## Refund Process

- Approved refunds are processed within 5-10 business days
- Refunds are issued to the original payment method
- Shipping fees may not be refundable

## Non-Returnable Items

- Opened products (unless defective)
- Products damaged after delivery due to customer negligence
- Items returned after 24 hours without prior authorization

## Cancellations

Orders may be cancelled before they are confirmed by the store. Contact support immediately if you need to cancel.', TRUE),

('legal/legal-notice', 'Legal Notice', 'legal',
'# Legal Notice

## Company Information

This platform is operated in compliance with all applicable federal, state, and local laws regarding the sale and delivery of alcoholic beverages.

## Licensing

All vendor stores on our platform maintain valid liquor licenses for their jurisdictions. License information is available upon request.

## Age Verification

We are committed to preventing underage sales. All customers must verify they are 21 years or older, and ID is checked at delivery.

## Responsible Drinking

We encourage responsible consumption of alcohol. If you or someone you know needs help with alcohol addiction, please contact:

- SAMHSA National Helpline: 1-800-662-4357

## Copyright

All content on this platform is protected by copyright laws.

## Trademarks

All trademarks and brand names belong to their respective owners.', TRUE),

('legal/cookie-policy', 'Cookie Policy', 'legal',
'# Cookie Policy

*Last updated: January 2025*

## What Are Cookies?

Cookies are small text files stored on your device when you visit our website.

## How We Use Cookies

### Essential Cookies
Required for the website to function properly:
- Session management
- Shopping cart functionality
- Security features

### Analytics Cookies
Help us understand how visitors use our site:
- Page views and navigation
- Feature usage
- Performance monitoring

### Marketing Cookies
Used to personalize content and ads:
- Remembering preferences
- Targeted advertising (with consent)

## Managing Cookies

You can control cookies through your browser settings. Note that disabling cookies may affect website functionality.

## Third-Party Cookies

Some cookies may be set by third-party services we use, such as payment processors and analytics providers.', TRUE),

('legal/age-restrictions', 'Age Restrictions', 'legal',
'# Age Restrictions

## Legal Requirements

The legal drinking age in the United States is 21 years old. By using our platform, you confirm that you are of legal drinking age.

## Age Verification Process

### At Registration
- You must confirm your age when creating an account
- Date of birth may be required

### At Purchase
- Age verification may be required for certain transactions

### At Delivery
- Valid government-issued ID is required
- Delivery person will verify ID matches the order
- Delivery will be refused if ID cannot be verified

## Acceptable Forms of ID

- State-issued driver''s license
- State-issued ID card
- U.S. Passport
- Military ID

## Our Commitment

We are committed to preventing underage sales and will:
- Train all delivery partners on ID verification
- Refuse delivery to anyone who cannot verify age
- Report attempts to purchase by minors

## Penalties

Attempting to purchase alcohol underage is illegal and may result in legal consequences.', TRUE)

ON CONFLICT (slug) DO NOTHING;
