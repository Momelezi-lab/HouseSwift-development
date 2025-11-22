'use client'

import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-[#1A531A] text-white py-12 px-4 shadow-2xl">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 font-semibold"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2">Settings</h1>
          <p className="text-xl text-white/90">Customize your preferences</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="space-y-6">
            <div className="p-6 bg-[#90B890]/10 rounded-xl border border-[#90B890]">
              <h3 className="text-xl font-bold text-[#1A531A] mb-4">Notifications</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-700 font-medium">Email Notifications</span>
                  <input type="checkbox" defaultChecked className="w-5 h-5 text-[#1A531A] rounded" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-700 font-medium">SMS Notifications</span>
                  <input type="checkbox" className="w-5 h-5 text-[#1A531A] rounded" />
                </label>
              </div>
            </div>

            <div className="p-6 bg-[#90B890]/10 rounded-xl border border-[#90B890]">
              <h3 className="text-xl font-bold text-[#1A531A] mb-4">Preferences</h3>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-gray-700 font-medium mb-2 block">Language</span>
                  <select className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A531A] focus:border-[#1A531A]">
                    <option>English</option>
                    <option>Afrikaans</option>
                    <option>Zulu</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

