import Link from 'next/link'
import Image from 'next/image'

const services = [
  {
    title: 'Cleaning Services',
    description: 'Professional deep cleaning for your home',
    href: '/services/cleaning',
    icon: '🧹',
    available: true,
  },
  {
    title: 'Plumbing',
    description: 'Expert plumbing repairs and installations',
    href: '/book-plumbing',
    icon: '🔧',
    available: false,
  },
  {
    title: 'Electrical',
    description: 'Licensed electricians for all your needs',
    href: '/book-electrical',
    icon: '⚡',
    available: false,
  },
  {
    title: 'Pest Control',
    description: 'Effective pest elimination solutions',
    href: '/book-pestcontrol',
    icon: '🐛',
    available: false,
  },
  {
    title: 'Gardening',
    description: 'Landscaping and garden maintenance',
    href: '/book-gardening',
    icon: '🌳',
    available: false,
  },
  {
    title: 'Handyman',
    description: 'General repairs and home fixes',
    href: '/book-handyman',
    icon: '🛠️',
    available: false,
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 relative">
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-block mb-6 animate-bounce">
              <Image
                src="/Untitled design.png"
                alt="HomeSwift Logo"
                width={300}
                height={120}
                className="h-16 md:h-20 w-auto object-contain mx-auto"
                priority
              />
            </div>
            <h1 className="text-6xl md:text-7xl font-extrabold text-[#1A531A] mb-6">
              Welcome to HomeSwift
            </h1>
            <p className="text-2xl md:text-3xl text-gray-700 mb-4 font-medium">
              Professional Home Services at Your Doorstep
            </p>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Book trusted professionals for all your home service needs. Fast, reliable, and affordable.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="text-center mb-16 space-x-4">
            <Link
              href="/services/cleaning"
              className="inline-flex items-center gap-3 bg-[#90B890] text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-[#90B890]/90 transform hover:scale-105 transition-all duration-300"
            >
              <span>ℹ️</span>
              <span>Learn More</span>
            </Link>
            <Link
              href="/book-service"
              className="inline-flex items-center gap-3 bg-[#1A531A] text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-[#1A531A]/90 transform hover:scale-105 transition-all duration-300"
            >
              <span>🚀</span>
              <span>Book Now</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="container mx-auto px-4 pb-20">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
          Our Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {services.map((service, index) => (
            <ServiceCard key={service.title} service={service} index={index} />
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white/80 backdrop-blur-sm py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard
              icon="⚡"
              title="Fast Service"
              description="Book and get service within 24 hours"
            />
            <FeatureCard
              icon="✅"
              title="Verified Professionals"
              description="All service providers are background checked"
            />
            <FeatureCard
              icon="💰"
              title="Transparent Pricing"
              description="No hidden fees, see prices upfront"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ServiceCard({
  service,
  index,
}: {
  service: (typeof services)[0]
  index: number
}) {
  if (!service.available) {
    return (
      <div className="group relative p-8 rounded-2xl bg-gray-100 border-2 border-gray-300 opacity-75 cursor-not-allowed transform transition-all duration-300">
        <div className="absolute top-4 right-4 bg-gray-500 text-white text-xs font-bold px-3 py-1 rounded-full">
          Coming Soon
        </div>
        <div className="text-5xl mb-4">{service.icon}</div>
        <h3 className="text-2xl font-bold text-gray-700 mb-3">{service.title}</h3>
        <p className="text-gray-600">{service.description}</p>
      </div>
    )
  }

  return (
    <Link
      href={service.href}
      className="group relative p-8 rounded-2xl bg-white border-2 border-[#90B890] hover:border-[#1A531A] shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Content */}
      <div className="relative z-10">
        <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
          {service.icon}
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#1A531A] transition-colors">
          {service.title}
        </h3>
        <p className="text-gray-600 mb-4">{service.description}</p>
        <div className="flex items-center text-[#1A531A] font-semibold group-hover:translate-x-2 transition-transform">
          <span>Book Now</span>
          <span className="ml-2">→</span>
        </div>
      </div>
    </Link>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="text-center p-6 rounded-xl bg-[#90B890]/10 border border-[#90B890] hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-[#1A531A] mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

