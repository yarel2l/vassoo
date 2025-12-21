import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Target, Lightbulb, Shield, Handshake } from "lucide-react"

export default function OurMissionPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Our Mission</h1>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto">
            To democratize access to premium spirits by creating the world's most comprehensive, transparent, and
            user-friendly marketplace for liquor enthusiasts everywhere.
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-lg p-8 mb-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">What Drives Us</h2>
          <p className="text-xl text-white/90 max-w-4xl mx-auto">
            We believe that everyone should have access to the world's finest spirits at fair prices, with complete
            transparency about what they're buying and who they're buying from. Our mission is to break down the
            barriers that have traditionally made premium liquor shopping complex, expensive, and exclusive.
          </p>
        </div>

        {/* Core Objectives */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Our Core Objectives</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8">
                <Target className="h-12 w-12 text-amber-500 mb-4" />
                <h3 className="text-2xl font-semibold text-white mb-4">Accessibility & Transparency</h3>
                <p className="text-gray-300 mb-4">
                  Make premium spirits accessible to everyone by providing transparent pricing, detailed product
                  information, and honest reviews from real customers.
                </p>
                <ul className="text-gray-300 space-y-2">
                  <li>• Clear, upfront pricing with no hidden fees</li>
                  <li>• Comprehensive product descriptions and specifications</li>
                  <li>• Authentic customer reviews and ratings</li>
                  <li>• Price comparison across multiple retailers</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8">
                <Lightbulb className="h-12 w-12 text-amber-500 mb-4" />
                <h3 className="text-2xl font-semibold text-white mb-4">Education & Discovery</h3>
                <p className="text-gray-300 mb-4">
                  Empower customers with knowledge and help them discover new favorites through educational content,
                  expert recommendations, and personalized suggestions.
                </p>
                <ul className="text-gray-300 space-y-2">
                  <li>• Expert tasting notes and pairing suggestions</li>
                  <li>• Educational content about spirits and distilleries</li>
                  <li>• Personalized recommendations based on preferences</li>
                  <li>• Curated collections for different occasions</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8">
                <Shield className="h-12 w-12 text-amber-500 mb-4" />
                <h3 className="text-2xl font-semibold text-white mb-4">Quality & Authenticity</h3>
                <p className="text-gray-300 mb-4">
                  Ensure every product sold through our platform is authentic, properly stored, and sourced from
                  licensed, reputable retailers.
                </p>
                <ul className="text-gray-300 space-y-2">
                  <li>• Rigorous retailer vetting and certification process</li>
                  <li>• Authenticity guarantees on all products</li>
                  <li>• Proper storage and handling requirements</li>
                  <li>• Quality assurance and customer protection</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8">
                <Handshake className="h-12 w-12 text-amber-500 mb-4" />
                <h3 className="text-2xl font-semibold text-white mb-4">Community & Responsibility</h3>
                <p className="text-gray-300 mb-4">
                  Build a responsible community of spirits enthusiasts while promoting safe, legal, and mindful
                  consumption practices.
                </p>
                <ul className="text-gray-300 space-y-2">
                  <li>• Strict age verification and compliance</li>
                  <li>• Responsible drinking education and resources</li>
                  <li>• Community forums for sharing knowledge</li>
                  <li>• Support for local distilleries and craft producers</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Vision Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-8">Our Vision for the Future</h2>
          <div className="bg-gray-800 rounded-lg p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-4">Where We're Headed</h3>
                <div className="space-y-4 text-gray-300">
                  <p>
                    We envision a future where discovering and purchasing premium spirits is as easy as ordering any
                    other product online, but with the expertise, care, and attention to detail that these special
                    products deserve.
                  </p>
                  <p>
                    Our goal is to become the definitive global platform for spirits commerce, connecting customers with
                    the world's finest distilleries, retailers, and fellow enthusiasts in a seamless, trustworthy
                    environment.
                  </p>
                  <p>
                    We're working toward a marketplace that not only serves individual consumers but also supports the
                    entire spirits ecosystem – from small craft distilleries to established retailers, from casual
                    drinkers to serious collectors.
                  </p>
                </div>
              </div>
              <div>
                <img
                  src="/placeholder.svg?height=400&width=600"
                  alt="Future of spirits marketplace"
                  className="w-full h-80 object-cover rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Impact Goals */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Our Impact Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-amber-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">1M+</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Customers Served</h3>
              <p className="text-gray-300">Reach and serve over one million spirits enthusiasts worldwide by 2030.</p>
            </div>
            <div className="text-center">
              <div className="bg-amber-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">$1B</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Economic Impact</h3>
              <p className="text-gray-300">
                Generate over $1 billion in economic value for our retail partners and distilleries.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-amber-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">100%</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Responsible Commerce</h3>
              <p className="text-gray-300">
                Maintain 100% compliance with all regulations while promoting responsible consumption.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Join Our Mission</h2>
          <p className="text-xl text-gray-300 mb-6 max-w-3xl mx-auto">
            Whether you're a spirits enthusiast, a retailer, or a distillery, we invite you to be part of our mission to
            transform the spirits marketplace. Together, we can create a more accessible, transparent, and enjoyable
            experience for everyone.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/about/work-with-us"
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Work With Us
            </a>
            <a
              href="/support/contact"
              className="border border-gray-600 text-gray-300 hover:bg-gray-700 px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Get in Touch
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
