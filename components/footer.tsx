"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Facebook, Twitter, Instagram, Youtube, Apple, Smartphone, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useLocation } from "@/contexts/location-context"
import LocationSelectorModal from "@/components/location-selector-modal"

interface PlatformSettings {
  platform_name: string
  platform_tagline: string
  footer_description: string
  contact_info: {
    address: string
    phone: string
    email: string
  }
  social_links: {
    facebook: string
    twitter: string
    instagram: string
    youtube: string
  }
  app_links: {
    apple: string
    android: string
  }
}

interface FooterPage {
  slug: string
  title: string
  category: string
}

interface FooterPages {
  about: FooterPage[]
  support: FooterPage[]
  legal: FooterPage[]
}

export default function Footer() {
  const currentYear = new Date().getFullYear()
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [pages, setPages] = useState<FooterPages>({ about: [], support: [], legal: [] })
  const [showLocationDialog, setShowLocationDialog] = useState(false)
  const { address, location, requestLocation, setManualAddress } = useLocation()

  useEffect(() => {
    async function fetchSettings() {
      const supabase = createClient()
      const { data } = await supabase
        .from('platform_settings')
        .select('key, value')
        .eq('is_public', true)

      if (data) {
        const settingsMap: any = {}
        data.forEach(item => {
          settingsMap[item.key] = item.value
        })
        setSettings(settingsMap as PlatformSettings)
      }
    }

    async function fetchPages() {
      try {
        const response = await fetch('/api/pages')
        if (response.ok) {
          const data = await response.json()
          setPages(data)
        }
      } catch (error) {
        console.error('Failed to fetch footer pages:', error)
      }
    }

    fetchSettings()
    fetchPages()
  }, [])

  const name = settings?.platform_name || "Vassoo"
  const description = settings?.footer_description || "Your premium destination for spirits, wines, and liquors. Discover the finest selection from multiple stores with competitive prices and fast delivery."
  const contact = settings?.contact_info
  const socials = settings?.social_links
  const apps = settings?.app_links

  return (
    <footer className="bg-gray-900 text-white border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold mb-4">{name}</h3>
            <p className="text-gray-400 text-sm mb-4">
              {description}
            </p>

            {/* App Download Buttons */}
            <div className="space-y-2">
              {apps?.apple && apps.apple !== "#" && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs h-10 bg-black border-gray-600 hover:bg-gray-800"
                >
                  <Link href={apps.apple}>
                    <Apple className="h-5 w-5 mr-2" />
                    <div className="text-left">
                      <div className="text-xs text-gray-400">Download on the</div>
                      <div className="text-sm font-medium">App Store</div>
                    </div>
                  </Link>
                </Button>
              )}
              {apps?.android && apps.android !== "#" && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs h-10 bg-black border-gray-600 hover:bg-gray-800"
                >
                  <Link href={apps.android}>
                    <Smartphone className="h-5 w-5 mr-2" />
                    <div className="text-left">
                      <div className="text-xs text-gray-400">Get it on</div>
                      <div className="text-sm font-medium">Google Play</div>
                    </div>
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* About Us */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-gray-200">About Us</h4>
            <ul className="space-y-2">
              {pages.about.length > 0 ? (
                pages.about.map((page) => (
                  <li key={page.slug}>
                    <Link
                      href={`/${page.slug}`}
                      className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      {page.title}
                    </Link>
                  </li>
                ))
              ) : (
                <>
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
                </>
              )}
            </ul>
          </div>

          {/* Customer Support */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-gray-200">Customer Support</h4>
            <ul className="space-y-2">
              {pages.support.length > 0 ? (
                pages.support.map((page) => (
                  <li key={page.slug}>
                    <Link
                      href={`/${page.slug}`}
                      className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      {page.title}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li>
                    <Link href="/support/faq" className="text-gray-400 hover:text-white text-sm transition-colors">
                      FAQs
                    </Link>
                  </li>
                  <li>
                    <Link href="/support/contact" className="text-gray-400 hover:text-white text-sm transition-colors">
                      Contact
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-gray-200">Legal & Compliance</h4>
            <ul className="space-y-2">
              {pages.legal.length > 0 ? (
                pages.legal.map((page) => (
                  <li key={page.slug}>
                    <Link
                      href={`/${page.slug}`}
                      className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      {page.title}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li>
                    <Link href="/legal/privacy-policy" className="text-gray-400 hover:text-white text-sm transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/legal/terms-conditions" className="text-gray-400 hover:text-white text-sm transition-colors">
                      Terms & Conditions
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-gray-200">Contact Information</h4>
            <div className="space-y-2 text-sm text-gray-400">
              {contact?.address && <p>{contact.address}</p>}
              {contact?.phone && <p>Phone: {contact.phone}</p>}
              {contact?.email && <p>Email: {contact.email}</p>}

              {/* Social Media Icons */}
              <div className="flex space-x-3 pt-3">
                {socials?.facebook && socials.facebook !== "#" && (
                  <Link href={socials.facebook} className="text-gray-400 hover:text-white transition-colors">
                    <Facebook className="h-5 w-5" />
                  </Link>
                )}
                {socials?.twitter && socials.twitter !== "#" && (
                  <Link href={socials.twitter} className="text-gray-400 hover:text-white transition-colors">
                    <Twitter className="h-5 w-5" />
                  </Link>
                )}
                {socials?.instagram && socials.instagram !== "#" && (
                  <Link href={socials.instagram} className="text-gray-400 hover:text-white transition-colors">
                    <Instagram className="h-5 w-5" />
                  </Link>
                )}
                {socials?.youtube && socials.youtube !== "#" && (
                  <Link href={socials.youtube} className="text-gray-400 hover:text-white transition-colors">
                    <Youtube className="h-5 w-5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">&copy; {currentYear} {name}. All rights reserved.</p>
            
            {/* User Location */}
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-amber-500" />
              {address ? (
                <span className="text-gray-400">
                  Delivering to: <span className="text-gray-300">{address}</span>
                </span>
              ) : (
                <span className="text-gray-400">No delivery location set</span>
              )}
              <button 
                onClick={() => setShowLocationDialog(true)}
                className="text-amber-500 hover:text-amber-400 transition-colors ml-1 underline underline-offset-2"
              >
                Change
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Location Selector Modal */}
      <LocationSelectorModal 
        isOpen={showLocationDialog} 
        onClose={() => setShowLocationDialog(false)} 
      />
    </footer>
  )
}
