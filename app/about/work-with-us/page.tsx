import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Briefcase, Users, TrendingUp, Award, Heart, Globe } from "lucide-react"

export default function WorkWithUsPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Work With Us</h1>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto">
            Join our passionate team of spirits enthusiasts, technology innovators, and customer service experts. Help
            us revolutionize the way people discover and purchase premium liquors.
          </p>
        </div>

        {/* Why Join Us */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Why Join LiquorHub?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Growth Opportunities</h3>
                <p className="text-gray-300">
                  Join a rapidly growing company with endless opportunities for career advancement and skill
                  development.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Amazing Team</h3>
                <p className="text-gray-300">
                  Work alongside passionate professionals who share your enthusiasm for excellence and innovation.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6 text-center">
                <Award className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Competitive Benefits</h3>
                <p className="text-gray-300">
                  Enjoy comprehensive benefits, competitive salaries, and unique perks in the spirits industry.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Open Positions */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Current Openings</h2>
          <div className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div className="mb-4 md:mb-0">
                    <h3 className="text-xl font-semibold text-white mb-2">Senior Software Engineer</h3>
                    <p className="text-gray-300 mb-2">Full-time • Remote/New York • Engineering</p>
                    <p className="text-gray-400 text-sm">
                      Lead development of our marketplace platform using React, Node.js, and cloud technologies.
                    </p>
                  </div>
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white">Apply Now</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div className="mb-4 md:mb-0">
                    <h3 className="text-xl font-semibold text-white mb-2">Product Marketing Manager</h3>
                    <p className="text-gray-300 mb-2">Full-time • New York • Marketing</p>
                    <p className="text-gray-400 text-sm">
                      Drive product marketing strategy and go-to-market execution for new features and partnerships.
                    </p>
                  </div>
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white">Apply Now</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div className="mb-4 md:mb-0">
                    <h3 className="text-xl font-semibold text-white mb-2">Customer Success Specialist</h3>
                    <p className="text-gray-300 mb-2">Full-time • Austin • Customer Success</p>
                    <p className="text-gray-400 text-sm">
                      Ensure exceptional customer experiences and build lasting relationships with our users.
                    </p>
                  </div>
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white">Apply Now</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div className="mb-4 md:mb-0">
                    <h3 className="text-xl font-semibold text-white mb-2">Data Analyst</h3>
                    <p className="text-gray-300 mb-2">Full-time • Remote • Data & Analytics</p>
                    <p className="text-gray-400 text-sm">
                      Analyze marketplace trends, customer behavior, and business metrics to drive strategic decisions.
                    </p>
                  </div>
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white">Apply Now</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div className="mb-4 md:mb-0">
                    <h3 className="text-xl font-semibold text-white mb-2">Spirits Category Manager</h3>
                    <p className="text-gray-300 mb-2">Full-time • New York • Merchandising</p>
                    <p className="text-gray-400 text-sm">
                      Curate our spirits selection, manage vendor relationships, and optimize product offerings.
                    </p>
                  </div>
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white">Apply Now</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Benefits & Perks */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">Benefits & Perks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8">
                <Heart className="h-8 w-8 text-amber-500 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-4">Health & Wellness</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Comprehensive health, dental, and vision insurance</li>
                  <li>• Mental health support and counseling services</li>
                  <li>• Gym membership reimbursement</li>
                  <li>• Flexible PTO and sick leave policies</li>
                  <li>• Wellness stipend for health-related expenses</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8">
                <Briefcase className="h-8 w-8 text-amber-500 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-4">Professional Development</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Annual learning and development budget</li>
                  <li>• Conference attendance and speaking opportunities</li>
                  <li>• Internal mentorship programs</li>
                  <li>• Skills training and certification support</li>
                  <li>• Career advancement planning</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8">
                <Globe className="h-8 w-8 text-amber-500 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-4">Work-Life Balance</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Flexible work arrangements and remote options</li>
                  <li>• Unlimited PTO policy</li>
                  <li>• Parental leave for new parents</li>
                  <li>• Sabbatical opportunities for long-term employees</li>
                  <li>• Company retreats and team building events</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8">
                <Award className="h-8 w-8 text-amber-500 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-4">Unique Perks</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>• Employee discount on all products</li>
                  <li>• Quarterly spirits tasting events</li>
                  <li>• Stock options and equity participation</li>
                  <li>• Catered lunches and premium coffee</li>
                  <li>• Access to exclusive spirits releases</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Company Culture */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-8">Our Culture</h2>
          <div className="bg-gray-800 rounded-lg p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-4">What Makes Us Different</h3>
                <div className="space-y-4 text-gray-300">
                  <p>
                    At LiquorHub, we believe that great work comes from great people who are passionate about what they
                    do. Our culture is built on collaboration, innovation, and a shared love for exceptional spirits.
                  </p>
                  <p>
                    We foster an environment where everyone's voice is heard, ideas are celebrated, and personal growth
                    is encouraged. Whether you're a spirits connoisseur or a technology enthusiast, you'll find a place
                    to thrive at LiquorHub.
                  </p>
                  <p>
                    We're committed to diversity, inclusion, and creating a workplace where everyone feels valued and
                    empowered to do their best work.
                  </p>
                </div>
              </div>
              <div>
                <img
                  src="/placeholder.svg?height=400&width=600"
                  alt="LiquorHub team culture"
                  className="w-full h-80 object-cover rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Application Process */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-8">Application Process</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-amber-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-white">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Apply Online</h3>
              <p className="text-gray-300 text-sm">
                Submit your application through our careers portal with your resume and cover letter.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-amber-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Initial Screening</h3>
              <p className="text-gray-300 text-sm">
                Our recruiting team will review your application and conduct an initial phone screening.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-amber-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-white">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Team Interviews</h3>
              <p className="text-gray-300 text-sm">
                Meet with team members and hiring managers through video or in-person interviews.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-amber-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold text-white">4</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Welcome Aboard</h3>
              <p className="text-gray-300 text-sm">Receive your offer and join our comprehensive onboarding program.</p>
            </div>
          </div>
        </div>

        {/* Contact for Opportunities */}
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Don't See the Right Role?</h2>
          <p className="text-xl text-gray-300 mb-6 max-w-3xl mx-auto">
            We're always looking for talented individuals to join our team. Send us your resume and tell us how you'd
            like to contribute to LiquorHub's mission.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3">Send Your Resume</Button>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 px-8 py-3 bg-transparent"
            >
              Join Our Talent Network
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
