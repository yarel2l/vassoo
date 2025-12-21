"use client"

import Link from "next/link"
import { Facebook, Twitter, Instagram, Youtube, Apple, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-white border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold mb-4">LiquorHub</h3>
            <p className="text-gray-400 text-sm mb-4">
              Your premium destination for spirits, wines, and liquors. Discover the finest selection from multiple
              stores with competitive prices and fast delivery.
            </p>

            {/* App Download Buttons */}
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-10 bg-black border-gray-600 hover:bg-gray-800"
              >
                <Apple className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="text-xs text-gray-400">Download on the</div>
                  <div className="text-sm font-medium">App Store</div>
                </div>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-10 bg-black border-gray-600 hover:bg-gray-800"
              >
                <Smartphone className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="text-xs text-gray-400">Get it on</div>
                  <div className="text-sm font-medium">Google Play</div>
                </div>
              </Button>
            </div>
          </div>

          {/* About Us */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-gray-200">About Us</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about/who-we-are" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Who We Are
                </Link>
              </li>
              <li>
                <Link href="/about/our-mission" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Our Mission
                </Link>
              </li>
              <li>
                <Link href="/about/location-hours" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Location & Hours
                </Link>
              </li>
              <li>
                <Link href="/about/work-with-us" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Work with Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Support */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-gray-200">Customer Support</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/support/faq" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Frequently Asked Questions (FAQs)
                </Link>
              </li>
              <li>
                <Link
                  href="/support/shipping-delivery"
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Shipping & Delivery
                </Link>
              </li>
              <li>
                <Link
                  href="/support/payment-methods-info"
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Payment Methods
                </Link>
              </li>
              <li>
                <Link
                  href="/support/order-tracking"
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Order Tracking
                </Link>
              </li>
              <li>
                <Link href="/support/contact" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-gray-200">Legal & Compliance</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/legal/privacy-policy" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/terms-conditions"
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/returns-refunds"
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Returns & Refunds Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/legal-notice" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Legal Notice
                </Link>
              </li>
              <li>
                <Link href="/legal/cookie-policy" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/age-restrictions"
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Age Restrictions (18+)
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-gray-200">Contact Information</h4>
            <div className="space-y-2 text-sm text-gray-400">
              <p>123 Liquor Street</p>
              <p>New York, NY 10001</p>
              <p>Phone: (555) 123-4567</p>
              <p>Email: info@liquorhub.com</p>

              {/* Social Media Icons */}
              <div className="flex space-x-3 pt-3">
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Facebook className="h-5 w-5" />
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Twitter className="h-5 w-5" />
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Instagram className="h-5 w-5" />
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Youtube className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">© {currentYear} LiquorHub. All rights reserved.</p>
            <p className="text-gray-400 text-sm mt-2 md:mt-0">Please drink responsibly. Must be 21+ to purchase.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
