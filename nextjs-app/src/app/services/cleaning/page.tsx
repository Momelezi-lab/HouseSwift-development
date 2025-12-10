"use client";

import Link from "next/link";

export default function CleaningServicePage() {
  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      {/* Header */}
      <header className="bg-[#2563EB] text-white py-12 sm:py-16 px-4 shadow-2xl">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-4 sm:mb-6 text-4xl sm:text-6xl animate-bounce">
            🧹
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold mb-2 sm:mb-4">
            Professional Cleaning Services
          </h1>
          <p className="text-sm sm:text-lg md:text-xl text-white/90">
            Deep cleaning solutions for your home
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {/* Service Overview */}
        <section className="bg-white rounded-xl shadow-xl p-4 sm:p-8 mb-8 border border-[#D1D5DB]">
          <h2 className="text-lg sm:text-3xl font-bold text-[#111827] mb-3 sm:mb-6">
            Why Choose Our Cleaning Services?
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-6">
            <div className="text-center p-2 sm:p-6 bg-[#EFF6FF] rounded-xl border border-[#2563EB]">
              <div className="text-xl sm:text-4xl mb-1 sm:mb-4">✨</div>
              <h3 className="text-xs sm:text-xl font-bold text-[#2563EB] mb-0.5 sm:mb-2">
                Professional Team
              </h3>
              <p className="text-xs sm:text-base text-[#6B7280]">
                Trained and experienced cleaners
              </p>
            </div>
            <div className="text-center p-2 sm:p-6 bg-[#EFF6FF] rounded-xl border border-[#2563EB]">
              <div className="text-xl sm:text-4xl mb-1 sm:mb-4">🌿</div>
              <h3 className="text-xs sm:text-xl font-bold text-[#2563EB] mb-0.5 sm:mb-2">
                Eco-Friendly
              </h3>
              <p className="text-xs sm:text-base text-[#6B7280]">
                Safe cleaning products for your family
              </p>
            </div>
            <div className="text-center p-2 sm:p-6 bg-[#EFF6FF] rounded-xl border border-[#2563EB]">
              <div className="text-xl sm:text-4xl mb-1 sm:mb-4">⚡</div>
              <h3 className="text-xs sm:text-xl font-bold text-[#2563EB] mb-0.5 sm:mb-2">
                Fast & Efficient
              </h3>
              <p className="text-xs sm:text-base text-[#6B7280]">
                Quick turnaround times
              </p>
            </div>
          </div>
        </section>

        {/* Service Types */}
        <section className="bg-white rounded-xl shadow-xl p-3 sm:p-8 mb-6 sm:mb-8 border border-[#D1D5DB]">
          <h2 className="text-lg sm:text-3xl font-bold text-[#111827] mb-3 sm:mb-6">
            Our Cleaning Services
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6">
            <ServiceTypeCard
              title="Standard Apartment Cleaning"
              description="Comprehensive standard cleaning package for apartments"
              icon="🏢"
              category="Standard Apartment Cleaning"
            />
            <ServiceTypeCard
              title="Apartment Spring Cleaning"
              description="Deep spring cleaning to refresh your apartment"
              icon="🌸"
              category="Apartment Spring Cleaning"
            />
            <ServiceTypeCard
              title="Apartment Deep Cleaning"
              description="Comprehensive deep cleaning for your entire apartment"
              icon="🔍"
              category="Apartment Deep Cleaning"
            />
            <ServiceTypeCard
              title="Empty Apartment Deep Cleaning"
              description="Complete deep cleaning for empty apartments"
              icon="📦"
              category="Empty Apartment Deep Cleaning"
            />
            <ServiceTypeCard
              title="House Spring Cleaning"
              description="Comprehensive spring cleaning for your entire house"
              icon="🏠"
              category="House Spring Cleaning"
            />
            <ServiceTypeCard
              title="House Deep Cleaning"
              description="Comprehensive deep cleaning for your entire house"
              icon="🏡"
              category="House Deep Cleaning"
            />
            <ServiceTypeCard
              title="Empty House Deep Cleaning"
              description="Complete deep cleaning for empty houses"
              icon="🏘️"
              category="Empty House Deep Cleaning"
            />
            <ServiceTypeCard
              title="Couch Deep Cleaning"
              description="Professional deep cleaning for all types of couches and upholstery"
              icon="🛋️"
              category="Couch Deep Cleaning"
            />
            <ServiceTypeCard
              title="Carpet Deep Cleaning"
              description="Deep steam cleaning for carpets and rugs"
              icon="🧸"
              category="Carpet Deep Cleaning"
            />
            <ServiceTypeCard
              title="Mattress Deep Cleaning"
              description="Sanitize and refresh your mattresses"
              icon="🛏️"
              category="Mattress Deep Cleaning"
            />
          </div>
        </section>

        {/* Process */}
        <section className="bg-[#EFF6FF] rounded-xl shadow-xl p-3 sm:p-8 mb-6 sm:mb-8 border border-[#2563EB]">
          <h2 className="text-lg sm:text-3xl font-bold text-[#111827] mb-3 sm:mb-6">
            How It Works
          </h2>
          <div className="space-y-2 sm:space-y-6">
            <ProcessStep
              number={1}
              title="Book Your Service"
              description="Select your cleaning service and preferred date/time"
            />
            <ProcessStep
              number={2}
              title="We Confirm"
              description="Our team confirms your booking within 2 hours"
            />
            <ProcessStep
              number={3}
              title="Service Day"
              description="Professional cleaners arrive at your scheduled time"
            />
            <ProcessStep
              number={4}
              title="Quality Check"
              description="We ensure everything meets our high standards"
            />
          </div>
        </section>

        {/* CTA */}
        <div className="text-center mb-4 sm:mb-8">
          <Link
            href="/book-service"
            className="inline-flex items-center gap-1 sm:gap-3 bg-[#2563EB] text-white px-4 sm:px-10 py-2 sm:py-5 rounded-xl font-bold text-xs sm:text-lg shadow-2xl hover:bg-[#1E40AF] transform hover:scale-105 transition-all duration-300"
          >
            <span>🚀</span>
            <span>Book Cleaning Service Now</span>
            <span>→</span>
          </Link>
        </div>
      </main>
    </div>
  );
}

function ServiceTypeCard({
  title,
  description,
  icon,
  category,
}: {
  title: string;
  description: string;
  icon: string;
  category?: string;
}) {
  const content = (
    <div className="p-2 sm:p-6 bg-white border border-[#D1D5DB] rounded-xl hover:border-[#2563EB] hover:shadow-lg transition-all">
      <div className="text-2xl sm:text-4xl mb-1 sm:mb-3">{icon}</div>
      <h3 className="text-xs sm:text-xl font-bold text-[#111827] mb-1 sm:mb-2">
        {title}
      </h3>
      <p className="text-xs sm:text-base text-[#6B7280] mb-1 sm:mb-3">
        {description}
      </p>
      {category && (
        <Link
          href={`/services/details?category=${encodeURIComponent(category)}`}
          className="inline-flex items-center gap-2 text-[#2563EB] hover:underline font-semibold text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          View Details →
        </Link>
      )}
    </div>
  );

  if (category) {
    return (
      <Link href={`/services/details?category=${encodeURIComponent(category)}`}>
        {content}
      </Link>
    );
  }

  return content;
}

function ProcessStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-2 sm:gap-4">
      <div className="w-8 h-8 sm:w-12 sm:h-12 bg-[#2563EB] rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-xl flex-shrink-0">
        {number}
      </div>
      <div>
        <h3 className="text-xs sm:text-xl font-bold text-[#111827] mb-0.5 sm:mb-1">
          {title}
        </h3>
        <p className="text-xs sm:text-base text-[#6B7280]">{description}</p>
      </div>
    </div>
  );
}
