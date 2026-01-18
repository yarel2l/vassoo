-- ============================================
-- Migration: 027_update_page_content_html
-- Description: Update page content from Markdown to HTML for Tiptap editor
-- ============================================

-- Update About Us pages with HTML content
UPDATE page_content SET content = '<h1>Who We Are</h1>
<p>Welcome to our premium beverage marketplace. We are dedicated to bringing you the finest selection of spirits, wines, and liquors from trusted vendors across the region.</p>
<h2>Our Story</h2>
<p>Founded with a passion for quality beverages, we have grown to become a trusted platform connecting discerning customers with reputable stores.</p>
<h2>Our Values</h2>
<ul>
<li><strong>Quality</strong>: We partner only with verified, licensed retailers</li>
<li><strong>Convenience</strong>: Shop from multiple stores in one place</li>
<li><strong>Trust</strong>: Secure payments and reliable delivery</li>
<li><strong>Selection</strong>: Extensive catalog of premium beverages</li>
</ul>'
WHERE slug = 'about/who-we-are';

UPDATE page_content SET content = '<h1>Our Mission</h1>
<p>Our mission is to revolutionize how you discover and purchase premium beverages by creating a seamless marketplace that connects you with the best local and national retailers.</p>
<h2>What We Believe</h2>
<p>We believe everyone deserves access to quality spirits, exceptional service, and competitive prices. Our platform makes this possible by:</p>
<ul>
<li>Aggregating inventory from multiple trusted vendors</li>
<li>Providing transparent pricing and delivery options</li>
<li>Ensuring age verification and responsible sales</li>
<li>Supporting local businesses and communities</li>
</ul>'
WHERE slug = 'about/our-mission';

UPDATE page_content SET content = '<h1>Location &amp; Hours</h1>
<h2>Contact Us</h2>
<p>Our customer support team is available to assist you with any questions or concerns.</p>
<p><strong>Customer Support Hours:</strong></p>
<ul>
<li>Monday - Friday: 9:00 AM - 8:00 PM EST</li>
<li>Saturday: 10:00 AM - 6:00 PM EST</li>
<li>Sunday: 12:00 PM - 5:00 PM EST</li>
</ul>
<p><strong>Delivery Hours:</strong></p>
<p>Delivery times vary by store and location. Please check individual store pages for their specific delivery schedules.</p>
<h2>Headquarters</h2>
<p>Contact information can be found in our footer or contact page.</p>'
WHERE slug = 'about/location-hours';

UPDATE page_content SET content = '<h1>Work With Us</h1>
<h2>Join Our Team</h2>
<p>We are always looking for talented individuals to join our growing team. Check back for current openings.</p>
<h2>Become a Partner Store</h2>
<p>Are you a licensed retailer looking to expand your reach? Partner with us to:</p>
<ul>
<li>Access a larger customer base</li>
<li>Benefit from our marketing and technology platform</li>
<li>Streamline your delivery operations</li>
<li>Grow your business with data-driven insights</li>
</ul>
<p>Contact us to learn more about partnership opportunities.</p>
<h2>Delivery Partners</h2>
<p>We work with professional delivery services to ensure safe, timely delivery of orders. If you are interested in becoming a delivery partner, please reach out to our partnerships team.</p>'
WHERE slug = 'about/work-with-us';

-- Update Customer Support pages
UPDATE page_content SET content = '<h1>Frequently Asked Questions</h1>
<h2>Orders &amp; Delivery</h2>
<p><strong>How long does delivery take?</strong></p>
<p>Delivery times vary by store and location. Most orders are delivered within 1-3 business days. Express delivery may be available in select areas.</p>
<p><strong>Can I track my order?</strong></p>
<p>Yes! Once your order is shipped, you will receive a tracking number via email.</p>
<p><strong>What if my order arrives damaged?</strong></p>
<p>Contact our support team immediately with photos of the damage. We will arrange a replacement or refund.</p>
<h2>Payments</h2>
<p><strong>What payment methods do you accept?</strong></p>
<p>We accept all major credit cards, debit cards, and select digital wallets.</p>
<p><strong>Is my payment information secure?</strong></p>
<p>Yes, we use industry-standard encryption and never store your full card details.</p>
<h2>Account</h2>
<p><strong>How do I create an account?</strong></p>
<p>Click "Sign Up" and follow the prompts. You will need to verify your age to complete registration.</p>
<p><strong>I forgot my password. What do I do?</strong></p>
<p>Click "Forgot Password" on the login page and follow the instructions sent to your email.</p>'
WHERE slug = 'support/faq';

UPDATE page_content SET content = '<h1>Shipping &amp; Delivery</h1>
<h2>Delivery Options</h2>
<p>Delivery options vary by store and your location. Available options may include:</p>
<ul>
<li><strong>Standard Delivery</strong>: 2-5 business days</li>
<li><strong>Express Delivery</strong>: Same-day or next-day (where available)</li>
<li><strong>Scheduled Delivery</strong>: Choose a specific date and time window</li>
</ul>
<h2>Delivery Fees</h2>
<p>Delivery fees are calculated based on:</p>
<ul>
<li>Distance from the store</li>
<li>Order total (free delivery thresholds may apply)</li>
<li>Delivery speed selected</li>
</ul>
<h2>Delivery Requirements</h2>
<ul>
<li>Someone 21+ must be present to receive alcohol deliveries</li>
<li>Valid ID will be checked upon delivery</li>
<li>Signature may be required</li>
</ul>
<h2>Delivery Areas</h2>
<p>We currently deliver to select areas. Enter your address at checkout to confirm availability.</p>'
WHERE slug = 'support/shipping-delivery';

UPDATE page_content SET content = '<h1>Payment Methods</h1>
<h2>Accepted Payment Methods</h2>
<p>We accept the following payment methods:</p>
<ul>
<li><strong>Credit Cards</strong>: Visa, Mastercard, American Express, Discover</li>
<li><strong>Debit Cards</strong>: With Visa or Mastercard logo</li>
<li><strong>Digital Wallets</strong>: Apple Pay, Google Pay (where available)</li>
</ul>
<h2>Payment Security</h2>
<p>Your payment information is protected by:</p>
<ul>
<li>256-bit SSL encryption</li>
<li>PCI DSS compliance</li>
<li>Secure tokenization (we never store full card numbers)</li>
</ul>
<h2>Billing</h2>
<ul>
<li>Your card will be charged when your order is confirmed</li>
<li>For split orders from multiple stores, you may see multiple charges</li>
<li>Refunds are processed to the original payment method within 5-10 business days</li>
</ul>'
WHERE slug = 'support/payment-methods-info';

UPDATE page_content SET content = '<h1>Order Tracking</h1>
<h2>How to Track Your Order</h2>
<ol>
<li><strong>Email Notifications</strong>: You will receive tracking updates via email</li>
<li><strong>Account Dashboard</strong>: Log in to view all your orders and their status</li>
<li><strong>Tracking Link</strong>: Click the tracking link in your confirmation email</li>
</ol>
<h2>Order Statuses</h2>
<ul>
<li><strong>Pending</strong>: Order received, awaiting confirmation</li>
<li><strong>Confirmed</strong>: Order confirmed by the store</li>
<li><strong>Preparing</strong>: Store is preparing your order</li>
<li><strong>Out for Delivery</strong>: Your order is on its way</li>
<li><strong>Delivered</strong>: Order has been delivered</li>
<li><strong>Cancelled</strong>: Order was cancelled</li>
</ul>
<h2>Issues with Your Order?</h2>
<p>If you experience any issues with tracking or delivery, please contact our support team with your order number.</p>'
WHERE slug = 'support/order-tracking';

UPDATE page_content SET content = '<h1>Contact Us</h1>
<h2>Get in Touch</h2>
<p>We are here to help! Choose the best way to reach us:</p>
<h3>Customer Support</h3>
<p>For order inquiries, delivery issues, or general questions:</p>
<ul>
<li>Check our FAQ first for quick answers</li>
<li>Email: <a href="mailto:support@example.com">support@example.com</a></li>
<li>Response time: Within 24 hours</li>
</ul>
<h3>Business Inquiries</h3>
<p>For partnership, vendor, or business-related inquiries:</p>
<ul>
<li>Email: <a href="mailto:partners@example.com">partners@example.com</a></li>
</ul>
<h3>Report an Issue</h3>
<p>If you need to report a problem with a product or service:</p>
<ul>
<li>Email: <a href="mailto:feedback@example.com">feedback@example.com</a></li>
<li>Please include your order number and detailed description</li>
</ul>
<h2>Response Times</h2>
<p>We aim to respond to all inquiries within 24 hours during business days.</p>'
WHERE slug = 'support/contact';

-- Update Legal & Compliance pages
UPDATE page_content SET content = '<h1>Privacy Policy</h1>
<p><em>Last updated: January 2025</em></p>
<h2>Introduction</h2>
<p>This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>
<h2>Information We Collect</h2>
<h3>Personal Information</h3>
<ul>
<li>Name and contact information</li>
<li>Date of birth (for age verification)</li>
<li>Delivery address</li>
<li>Payment information</li>
</ul>
<h3>Usage Information</h3>
<ul>
<li>Browser type and device information</li>
<li>Pages visited and features used</li>
<li>Search queries and preferences</li>
</ul>
<h2>How We Use Your Information</h2>
<ul>
<li>Process and deliver orders</li>
<li>Verify age for alcohol purchases</li>
<li>Improve our services</li>
<li>Send transactional communications</li>
<li>Marketing (with your consent)</li>
</ul>
<h2>Data Security</h2>
<p>We implement appropriate security measures to protect your personal information.</p>
<h2>Your Rights</h2>
<p>You have the right to access, correct, or delete your personal information. Contact us to exercise these rights.</p>'
WHERE slug = 'legal/privacy-policy';

UPDATE page_content SET content = '<h1>Terms &amp; Conditions</h1>
<p><em>Last updated: January 2025</em></p>
<h2>Agreement to Terms</h2>
<p>By accessing our platform, you agree to these Terms and Conditions.</p>
<h2>Eligibility</h2>
<p>You must be at least 21 years old to purchase alcohol through our platform. Age verification is required.</p>
<h2>Account Responsibilities</h2>
<ul>
<li>Provide accurate information</li>
<li>Maintain account security</li>
<li>Report unauthorized access</li>
</ul>
<h2>Orders and Payments</h2>
<ul>
<li>All orders are subject to acceptance and availability</li>
<li>Prices may vary by store and location</li>
<li>Payment is required at time of order</li>
</ul>
<h2>Delivery</h2>
<ul>
<li>Valid ID required for alcohol delivery</li>
<li>Someone 21+ must be present to receive orders</li>
<li>We reserve the right to refuse delivery</li>
</ul>
<h2>Limitation of Liability</h2>
<p>We are not liable for damages arising from use of our platform beyond what is required by law.</p>
<h2>Governing Law</h2>
<p>These terms are governed by applicable state and federal laws.</p>'
WHERE slug = 'legal/terms-conditions';

UPDATE page_content SET content = '<h1>Returns &amp; Refunds Policy</h1>
<h2>Return Eligibility</h2>
<p>Due to the nature of alcohol products, returns are limited to:</p>
<ul>
<li>Damaged products (reported within 24 hours of delivery)</li>
<li>Incorrect items received</li>
<li>Quality issues with sealed products</li>
</ul>
<h2>How to Request a Return</h2>
<ol>
<li>Contact customer support within 24 hours of delivery</li>
<li>Provide photos of the issue</li>
<li>Do not dispose of the product until instructed</li>
</ol>
<h2>Refund Process</h2>
<ul>
<li>Approved refunds are processed within 5-10 business days</li>
<li>Refunds are issued to the original payment method</li>
<li>Shipping fees may not be refundable</li>
</ul>
<h2>Non-Returnable Items</h2>
<ul>
<li>Opened products (unless defective)</li>
<li>Products damaged after delivery due to customer negligence</li>
<li>Items returned after 24 hours without prior authorization</li>
</ul>
<h2>Cancellations</h2>
<p>Orders may be cancelled before they are confirmed by the store. Contact support immediately if you need to cancel.</p>'
WHERE slug = 'legal/returns-refunds';

UPDATE page_content SET content = '<h1>Legal Notice</h1>
<h2>Company Information</h2>
<p>This platform is operated in compliance with all applicable federal, state, and local laws regarding the sale and delivery of alcoholic beverages.</p>
<h2>Licensing</h2>
<p>All vendor stores on our platform maintain valid liquor licenses for their jurisdictions. License information is available upon request.</p>
<h2>Age Verification</h2>
<p>We are committed to preventing underage sales. All customers must verify they are 21 years or older, and ID is checked at delivery.</p>
<h2>Responsible Drinking</h2>
<p>We encourage responsible consumption of alcohol. If you or someone you know needs help with alcohol addiction, please contact:</p>
<blockquote><p>SAMHSA National Helpline: <strong>1-800-662-4357</strong></p></blockquote>
<h2>Copyright</h2>
<p>All content on this platform is protected by copyright laws.</p>
<h2>Trademarks</h2>
<p>All trademarks and brand names belong to their respective owners.</p>'
WHERE slug = 'legal/legal-notice';

UPDATE page_content SET content = '<h1>Cookie Policy</h1>
<p><em>Last updated: January 2025</em></p>
<h2>What Are Cookies?</h2>
<p>Cookies are small text files stored on your device when you visit our website.</p>
<h2>How We Use Cookies</h2>
<h3>Essential Cookies</h3>
<p>Required for the website to function properly:</p>
<ul>
<li>Session management</li>
<li>Shopping cart functionality</li>
<li>Security features</li>
</ul>
<h3>Analytics Cookies</h3>
<p>Help us understand how visitors use our site:</p>
<ul>
<li>Page views and navigation</li>
<li>Feature usage</li>
<li>Performance monitoring</li>
</ul>
<h3>Marketing Cookies</h3>
<p>Used to personalize content and ads:</p>
<ul>
<li>Remembering preferences</li>
<li>Targeted advertising (with consent)</li>
</ul>
<h2>Managing Cookies</h2>
<p>You can control cookies through your browser settings. Note that disabling cookies may affect website functionality.</p>
<h2>Third-Party Cookies</h2>
<p>Some cookies may be set by third-party services we use, such as payment processors and analytics providers.</p>'
WHERE slug = 'legal/cookie-policy';

UPDATE page_content SET content = '<h1>Age Restrictions</h1>
<h2>Legal Requirements</h2>
<p>The legal drinking age in the United States is <strong>21 years old</strong>. By using our platform, you confirm that you are of legal drinking age.</p>
<h2>Age Verification Process</h2>
<h3>At Registration</h3>
<ul>
<li>You must confirm your age when creating an account</li>
<li>Date of birth may be required</li>
</ul>
<h3>At Purchase</h3>
<ul>
<li>Age verification may be required for certain transactions</li>
</ul>
<h3>At Delivery</h3>
<ul>
<li>Valid government-issued ID is required</li>
<li>Delivery person will verify ID matches the order</li>
<li>Delivery will be refused if ID cannot be verified</li>
</ul>
<h2>Acceptable Forms of ID</h2>
<ul>
<li>State-issued driver''s license</li>
<li>State-issued ID card</li>
<li>U.S. Passport</li>
<li>Military ID</li>
</ul>
<h2>Our Commitment</h2>
<p>We are committed to preventing underage sales and will:</p>
<ul>
<li>Train all delivery partners on ID verification</li>
<li>Refuse delivery to anyone who cannot verify age</li>
<li>Report attempts to purchase by minors</li>
</ul>
<h2>Penalties</h2>
<p><strong>Attempting to purchase alcohol underage is illegal and may result in legal consequences.</strong></p>'
WHERE slug = 'legal/age-restrictions';
