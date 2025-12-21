import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Clock, Phone, Mail, Car, Train, Bus } from "lucide-react"

export default function LocationHoursPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Location & Hours</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Visit our headquarters, distribution centers, and customer service locations. We're here to serve you with
            multiple convenient locations and extended hours.
          </p>
        </div>

        {/* Main Headquarters */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">Corporate Headquarters</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8">
                <div className="flex items-start space-x-4 mb-6">
                  <MapPin className="h-6 w-6 text-amber-500 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">LiquorHub Headquarters</h3>
                    <p className="text-gray-300">
                      123 Liquor Street
                      <br />
                      Suite 500
                      <br />
                      New York, NY 10001
                      <br />
                      United States
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-amber-500" />
                    <span className="text-gray-300">+1 (555) 123-4567</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-amber-500" />
                    <span className="text-gray-300">info@liquorhub.com</span>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <Clock className="h-5 w-5 text-amber-500 mr-2" />
                    Business Hours
                  </h4>
                  <div className="space-y-2 text-gray-300">
                    <div className="flex justify-between">
                      <span>Monday - Friday:</span>
                      <span>9:00 AM - 6:00 PM EST</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Saturday:</span>
                      <span>10:00 AM - 4:00 PM EST</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sunday:</span>
                      <span>Closed</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-gray-800 rounded-lg p-4">
              <img
                src="/placeholder.svg?height=400&width=600"
                alt="LiquorHub Headquarters"
                className="w-full h-80 object-cover rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Distribution Centers */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">Distribution Centers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">East Coast Hub</h3>
                <div className="space-y-3 text-gray-300">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-amber-500 mt-1" />
                    <div>
                      <p>456 Distribution Way</p>
                      <p>Newark, NJ 07102</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span>24/7 Operations</span>
                  </div>
                  <p className="text-sm text-gray-400">Serving: NY, NJ, CT, MA, PA, MD, VA, NC, SC, FL</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Central Hub</h3>
                <div className="space-y-3 text-gray-300">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-amber-500 mt-1" />
                    <div>
                      <p>789 Logistics Blvd</p>
                      <p>Chicago, IL 60601</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span>24/7 Operations</span>
                  </div>
                  <p className="text-sm text-gray-400">Serving: IL, IN, OH, MI, WI, MN, IA, MO, KS, NE</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">West Coast Hub</h3>
                <div className="space-y-3 text-gray-300">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-amber-500 mt-1" />
                    <div>
                      <p>321 Warehouse Ave</p>
                      <p>Los Angeles, CA 90210</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span>24/7 Operations</span>
                  </div>
                  <p className="text-sm text-gray-400">Serving: CA, NV, AZ, OR, WA, CO, UT, NM, TX</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Customer Service Centers */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">Customer Service Centers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Primary Support Center</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-amber-500 mt-1" />
                    <div className="text-gray-300">
                      <p>555 Support Street</p>
                      <p>Austin, TX 78701</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-amber-500" />
                    <span className="text-gray-300">+1 (555) SUPPORT</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2 flex items-center">
                      <Clock className="h-4 w-4 text-amber-500 mr-2" />
                      Support Hours
                    </h4>
                    <div className="space-y-1 text-gray-300 text-sm">
                      <div className="flex justify-between">
                        <span>Monday - Friday:</span>
                        <span>8:00 AM - 10:00 PM EST</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Saturday - Sunday:</span>
                        <span>10:00 AM - 8:00 PM EST</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">24/7 Emergency Support</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-amber-500 mt-1" />
                    <div className="text-gray-300">
                      <p>Remote Operations Center</p>
                      <p>Available Worldwide</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-amber-500" />
                    <span className="text-gray-300">+1 (555) URGENT-1</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2 flex items-center">
                      <Clock className="h-4 w-4 text-amber-500 mr-2" />
                      Emergency Hours
                    </h4>
                    <div className="text-gray-300 text-sm">
                      <p>Available 24/7 for:</p>
                      <ul className="mt-2 space-y-1 ml-4">
                        <li>• Order emergencies</li>
                        <li>• Payment issues</li>
                        <li>• Delivery problems</li>
                        <li>• Account security</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Transportation & Accessibility */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">Getting to Our Headquarters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <Car className="h-8 w-8 text-amber-500 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">By Car</h3>
                <div className="text-gray-300 text-sm space-y-2">
                  <p>
                    <strong>From Manhattan:</strong> Take FDR Drive South to Brooklyn Bridge
                  </p>
                  <p>
                    <strong>Parking:</strong> Validated parking available in building garage
                  </p>
                  <p>
                    <strong>Rate:</strong> $15/day for visitors
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <Train className="h-8 w-8 text-amber-500 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">By Subway</h3>
                <div className="text-gray-300 text-sm space-y-2">
                  <p>
                    <strong>Nearest Station:</strong> Brooklyn Bridge-City Hall (4,5,6)
                  </p>
                  <p>
                    <strong>Walking Distance:</strong> 3 minutes
                  </p>
                  <p>
                    <strong>Alternative:</strong> Fulton St (A,C,J,Z,2,3,4,5)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <Bus className="h-8 w-8 text-amber-500 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">By Bus</h3>
                <div className="text-gray-300 text-sm space-y-2">
                  <p>
                    <strong>Bus Lines:</strong> M15, M22, B25, B26
                  </p>
                  <p>
                    <strong>Nearest Stop:</strong> South St/Whitehall St
                  </p>
                  <p>
                    <strong>Walking Distance:</strong> 2 minutes
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Special Hours & Holidays */}
        <div>
          <h2 className="text-3xl font-bold text-white mb-8">Holiday Hours & Special Events</h2>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Holiday Schedule 2024</h3>
                  <div className="space-y-3 text-gray-300">
                    <div className="flex justify-between">
                      <span>New Year's Day:</span>
                      <span className="text-red-400">Closed</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memorial Day:</span>
                      <span className="text-amber-400">Limited Hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Independence Day:</span>
                      <span className="text-red-400">Closed</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Labor Day:</span>
                      <span className="text-amber-400">Limited Hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Thanksgiving:</span>
                      <span className="text-red-400">Closed</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Black Friday:</span>
                      <span className="text-green-400">Extended Hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Christmas Eve:</span>
                      <span className="text-amber-400">Half Day</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Christmas Day:</span>
                      <span className="text-red-400">Closed</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Special Notes</h3>
                  <div className="space-y-3 text-gray-300 text-sm">
                    <p>
                      <strong className="text-amber-500">Online Operations:</strong> Our website and customer service
                      remain available 24/7, even during office closures.
                    </p>
                    <p>
                      <strong className="text-amber-500">Delivery Services:</strong> May be limited during holidays.
                      Check our delivery calendar for specific dates.
                    </p>
                    <p>
                      <strong className="text-amber-500">Emergency Support:</strong> Available 24/7 for urgent order and
                      account issues.
                    </p>
                    <p>
                      <strong className="text-amber-500">Appointments:</strong> Schedule visits in advance during
                      holiday periods for guaranteed availability.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  )
}
