import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Award, Globe, Heart } from "lucide-react"

export default function WhoWeArePage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Who We Are</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            LiquorHub is more than just an online marketplace – we're passionate curators of the world's finest spirits,
            connecting enthusiasts with premium liquors from trusted retailers worldwide.
          </p>
        </div>

        {/* Story Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">Our Story</h2>
            <div className="space-y-4 text-gray-300">
              <p>
                Founded in 2020 by a team of spirits enthusiasts and technology experts, LiquorHub was born from a
                simple observation: finding premium liquors at the best prices was unnecessarily complicated and
                time-consuming.
              </p>
              <p>
                We set out to create a platform that would revolutionize how people discover, compare, and purchase
                premium spirits. By partnering with trusted retailers across the country, we've built a comprehensive
                marketplace that offers transparency, convenience, and unmatched selection.
              </p>
              <p>
                Today, LiquorHub serves thousands of customers nationwide, from casual drinkers to serious collectors,
                helping them find exactly what they're looking for at prices that make sense.
              </p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-8">
            <img
              src="/placeholder.svg?height=400&width=600"
              alt="LiquorHub team"
              className="w-full h-64 object-cover rounded-lg mb-6"
            />
            <h3 className="text-xl font-semibold text-white mb-4">Our Founding Principles</h3>
            <ul className="space-y-2 text-gray-300">
              <li>• Transparency in pricing and product information</li>
              <li>• Partnership with only licensed, reputable retailers</li>
              <li>• Exceptional customer service and support</li>
              <li>• Responsible alcohol consumption advocacy</li>
            </ul>
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Community</h3>
                <p className="text-gray-300">
                  Building a community of spirits enthusiasts who share knowledge, experiences, and passion for quality.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6 text-center">
                <Award className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Quality</h3>
                <p className="text-gray-300">
                  Curating only the finest spirits from reputable distilleries and trusted retail partners.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6 text-center">
                <Globe className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Accessibility</h3>
                <p className="text-gray-300">
                  Making premium spirits accessible to everyone through competitive pricing and nationwide delivery.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6 text-center">
                <Heart className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Responsibility</h3>
                <p className="text-gray-300">
                  Promoting responsible consumption and supporting initiatives that give back to our communities.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Leadership Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6 text-center">
                <img
                  src="/placeholder.svg?height=200&width=200"
                  alt="CEO"
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-semibold text-white mb-2">Sarah Johnson</h3>
                <p className="text-amber-500 mb-3">CEO & Co-Founder</p>
                <p className="text-gray-300 text-sm">
                  Former spirits industry executive with 15+ years of experience in retail and distribution.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6 text-center">
                <img
                  src="/placeholder.svg?height=200&width=200"
                  alt="CTO"
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-semibold text-white mb-2">Michael Chen</h3>
                <p className="text-amber-500 mb-3">CTO & Co-Founder</p>
                <p className="text-gray-300 text-sm">
                  Technology leader with expertise in e-commerce platforms and marketplace development.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6 text-center">
                <img
                  src="/placeholder.svg?height=200&width=200"
                  alt="CMO"
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-semibold text-white mb-2">David Rodriguez</h3>
                <p className="text-amber-500 mb-3">Chief Marketing Officer</p>
                <p className="text-gray-300 text-sm">
                  Marketing strategist specializing in luxury goods and consumer experience optimization.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gray-800 rounded-lg p-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">By the Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-amber-500 mb-2">50,000+</div>
              <div className="text-gray-300">Happy Customers</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-amber-500 mb-2">10,000+</div>
              <div className="text-gray-300">Products Available</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-amber-500 mb-2">500+</div>
              <div className="text-gray-300">Retail Partners</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-amber-500 mb-2">50</div>
              <div className="text-gray-300">States Served</div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
