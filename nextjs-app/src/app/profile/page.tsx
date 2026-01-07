'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { serviceRequestApi, complaintApi, reviewApi, trustScoreApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'bookings' | 'complaints'>('bookings')
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<any>(null)
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: '',
    reliabilityScore: 80,
    qualityScore: 80,
    communicationScore: 80,
  })
  const queryClient = useQueryClient()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      console.log('Profile page - User loaded:', parsedUser)
      setUser(parsedUser)
    } else {
      console.log('Profile page - No user data found in localStorage')
    }
  }, [])

  // Fetch customer's service requests
  const { data: bookings, isLoading: isLoadingBookings, error: bookingsError } = useQuery({
    queryKey: ['customer-bookings', user?.email],
    queryFn: async () => {
      if (!user?.email) {
        console.log('No user email, skipping bookings fetch')
        return []
      }
      const email = user.email.trim()
      console.log('Profile page - Fetching bookings for email:', email)
      try {
        const result = await serviceRequestApi.getAll({ customerEmail: email })
        console.log('Profile page - Bookings API response:', result)
        console.log('Profile page - Bookings count:', Array.isArray(result) ? result.length : 'not an array')
        return Array.isArray(result) ? result : []
      } catch (error) {
        console.error('Profile page - Error fetching bookings:', error)
        return []
      }
    },
    enabled: !!user?.email,
  })

  // Fetch reviews for completed bookings
  const { data: reviews } = useQuery({
    queryKey: ['customer-reviews', user?.email],
    queryFn: async () => {
      if (!user?.email) return []
      const customer = await fetch(`/api/customers?email=${user.email}`).then(r => r.json()).catch(() => null)
      if (!customer?.[0]?.customerId) return []
      return await reviewApi.getAll({ customerId: customer[0].customerId })
    },
    enabled: !!user?.email,
  })

  // Confirm completion mutation
  const confirmCompletionMutation = useMutation({
    mutationFn: (requestId: number) => serviceRequestApi.confirmCompletion(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-bookings'] })
      alert('Completion confirmed successfully!')
    },
    onError: (error: any) => {
      alert(error.message || 'Failed to confirm completion')
    },
  })

  // Create review mutation
  const createReviewMutation = useMutation({
    mutationFn: reviewApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['customer-bookings'] })
      setSelectedBookingForReview(null)
      setReviewForm({
        rating: 5,
        comment: '',
        reliabilityScore: 80,
        qualityScore: 80,
        communicationScore: 80,
      })
      alert('Review submitted successfully!')
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Failed to submit review')
    },
  })

  // Fetch customer's complaints
  const { data: complaints, isLoading: isLoadingComplaints, error: complaintsError } = useQuery({
    queryKey: ['customer-complaints', user?.email],
    queryFn: async () => {
      if (!user?.email) {
        console.log('No user email, skipping complaints fetch')
        return []
      }
      const email = user.email.trim()
      console.log('Profile page - Fetching complaints for email:', email)
      try {
        const result = await complaintApi.getAll({ email: email })
        console.log('Profile page - Complaints API response:', result)
        console.log('Profile page - Complaints count:', Array.isArray(result) ? result.length : 'not an array')
        return Array.isArray(result) ? result : []
      } catch (error) {
        console.error('Profile page - Error fetching complaints:', error)
        return []
      }
    },
    enabled: !!user?.email,
  })

  // Log errors if any
  useEffect(() => {
    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
    }
    if (complaintsError) {
      console.error('Error fetching complaints:', complaintsError)
    }
  }, [bookingsError, complaintsError])

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'resolved':
        return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]'
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#2563EB] text-white py-12 px-4 shadow-2xl">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 font-semibold"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2">My Profile</h1>
          <p className="text-xl text-white/90">Manage your account settings</p>
        </div>
      </header>

      {/* Profile Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {user ? (
            <div className="space-y-6">
              <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
                <div className="w-24 h-24 bg-[#2563EB] rounded-full flex items-center justify-center text-4xl text-white font-bold shadow-xl">
                  {user.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-1">{user.name}</h2>
                  <p className="text-gray-600">{user.email}</p>
                  {user.phone && <p className="text-gray-600">{user.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="p-6 bg-[#EFF6FF] rounded-xl border border-[#D1D5DB]">
                  <h3 className="font-bold text-[#2563EB] mb-2">Member Since</h3>
                  <p className="text-gray-600">{user.registered || 'N/A'}</p>
                </div>
                <div className="p-6 bg-[#EFF6FF] rounded-xl border border-[#D1D5DB]">
                  <h3 className="font-bold text-[#2563EB] mb-2">Account Status</h3>
                  <p className="text-[#2563EB] font-semibold">Active</p>
                </div>
              </div>


              {/* Tabs */}
              <div className="border-b border-gray-200 mb-6">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className={`pb-4 px-2 font-semibold transition-colors ${
                      activeTab === 'bookings'
                        ? 'text-[#2563EB] border-b border-[#2563EB]'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    My Bookings ({bookings?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('complaints')}
                    className={`pb-4 px-2 font-semibold transition-colors ${
                      activeTab === 'complaints'
                        ? 'text-[#2563EB] border-b border-[#2563EB]'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    My Complaints ({complaints?.length || 0})
                  </button>
                </div>
              </div>

              {/* Bookings Tab */}
              {activeTab === 'bookings' && (
                <div>
                  {isLoadingBookings ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b border-[#2563EB] mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading bookings...</p>
                    </div>
                  ) : bookings && bookings.length > 0 ? (
                    <div className="space-y-4">
                      {bookings.map((booking: any) => (
                        <div
                          key={booking.requestId}
                          className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 mb-1">
                                Request #{booking.requestId}
                              </h3>
                              <p className="text-gray-600">
                                {formatDate(booking.preferredDate)} at {booking.preferredTime}
                              </p>
                            </div>
                            <span
                              className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${getStatusColor(
                                booking.status
                              )}`}
                            >
                              {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Address</p>
                              <p className="font-semibold text-gray-900">{booking.customerAddress}</p>
                              {booking.unitNumber && (
                                <p className="text-sm text-gray-600">Unit {booking.unitNumber}</p>
                              )}
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                              <p className="text-2xl font-bold text-[#2563EB]">
                                {formatCurrency(booking.totalCustomerPaid || 0)}
                              </p>
                            </div>
                          </div>

                          {booking.providerName && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <p className="text-sm text-gray-600 mb-1">Assigned Provider</p>
                              <p className="font-semibold text-gray-900">{booking.providerName}</p>
                              {booking.providerPhone && (
                                <p className="text-sm text-gray-600">{booking.providerPhone}</p>
                              )}
                              {booking.providerEmail && booking.assignedProviderId && (
                                <ProviderTrustScore providerId={booking.assignedProviderId} />
                              )}
                            </div>
                          )}

                          {/* Completion Confirmation & Review Section */}
                          {booking.assignedProviderId && (booking.status === 'assigned' || booking.status === 'confirmed' || booking.status === 'in_progress' || booking.status === 'completed' || booking.customerConfirmedCompletion) && (
                            <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                              {/* Completion Confirmation */}
                              {(!booking.customerConfirmedCompletion && booking.status !== 'completed') && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  <p className="text-sm text-blue-800 font-semibold mb-2">Confirm Job Completion</p>
                                  <p className="text-xs text-blue-600 mb-3">Let us know when the service has been completed.</p>
                                  <button
                                    onClick={() => {
                                      if (confirm('Confirm that this job has been completed?')) {
                                        confirmCompletionMutation.mutate(booking.requestId)
                                      }
                                    }}
                                    disabled={confirmCompletionMutation.isPending}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 px-4 rounded-lg transition-all"
                                  >
                                    {confirmCompletionMutation.isPending ? 'Confirming...' : '✓ Confirm Completion'}
                                  </button>
                                </div>
                              )}

                              {booking.customerConfirmedCompletion && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                  <p className="text-sm text-green-800 font-semibold">✓ You confirmed completion</p>
                                  {booking.providerConfirmedCompletion ? (
                                    <p className="text-xs text-green-600 mt-1">Both parties confirmed - Job completed!</p>
                                  ) : (
                                    <p className="text-xs text-green-600 mt-1">Waiting for provider confirmation</p>
                                  )}
                                </div>
                              )}

                              {/* Review Button - Available when at least one party confirmed */}
                              {(booking.customerConfirmedCompletion || booking.providerConfirmedCompletion || booking.status === 'completed') && (
                                <div>
                                  {reviews?.some((r: any) => r.jobId === booking.requestId && r.reviewedBy === 'customer') ? (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                      <p className="text-sm text-green-800 font-semibold">✓ Review Submitted</p>
                                      <p className="text-xs text-green-600 mt-1">Thank you for your feedback!</p>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setSelectedBookingForReview(booking)}
                                      className="w-full bg-[#2563EB] hover:bg-[#1E40AF] text-white font-semibold py-2 px-4 rounded-lg transition-all"
                                    >
                                      Rate Provider
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {booking.additionalNotes && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <p className="text-sm text-gray-600 mb-1">Notes</p>
                              <p className="text-gray-900">{booking.additionalNotes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <p className="text-gray-600 mb-2">You haven't made any bookings yet</p>
                      <p className="text-sm text-gray-500 mb-4">
                        Bookings are linked to your account email: <strong>{user?.email}</strong>
                      </p>
                      <Link
                        href="/book-service"
                        className="inline-block bg-[#2563EB] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#2563EB]/90 transition-all"
                      >
                        Book a Service
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Complaints Tab */}
              {activeTab === 'complaints' && (
                <div>
                  {isLoadingComplaints ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b border-[#2563EB] mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading complaints...</p>
                    </div>
                  ) : complaints && complaints.length > 0 ? (
                    <div className="space-y-4">
                      {complaints.map((complaint: any) => (
                        <div
                          key={complaint.id}
                          className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 mb-1">
                                {complaint.title}
                              </h3>
                              <p className="text-gray-600">
                                {complaint.type} • {formatDate(complaint.date)}
                              </p>
                            </div>
                            <span
                              className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${getStatusColor(
                                complaint.status
                              )}`}
                            >
                              {complaint.status?.charAt(0).toUpperCase() + complaint.status?.slice(1)}
                            </span>
                          </div>

                          <p className="text-gray-700 mb-4">{complaint.description}</p>

                          {(complaint.serviceProvider || complaint.urgencyLevel) && (
                            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                              {complaint.serviceProvider && (
                                <div>
                                  <p className="text-sm text-gray-600 mb-1">Service Provider</p>
                                  <p className="font-semibold text-gray-900">{complaint.serviceProvider}</p>
                                </div>
                              )}
                              {complaint.urgencyLevel && (
                                <div>
                                  <p className="text-sm text-gray-600 mb-1">Urgency Level</p>
                                  <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                                    {complaint.urgencyLevel}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <p className="text-gray-600 mb-2">You haven't submitted any complaints</p>
                      <p className="text-sm text-gray-500 mb-4">
                        Complaints are linked to your account email: <strong>{user?.email}</strong>
                      </p>
                      <Link
                        href="/complaints"
                        className="inline-block bg-[#2563EB] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#2563EB]/90 transition-all"
                      >
                        Submit a Complaint
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Please log in to view your profile</p>
              <Link
                href="/login"
                className="inline-block bg-[#2563EB] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#2563EB]/90 hover:shadow-lg transform hover:scale-105 transition-all"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Review Modal */}
      {selectedBookingForReview && (
        <ReviewModal
          booking={selectedBookingForReview}
          reviewForm={reviewForm}
          setReviewForm={setReviewForm}
          onSubmit={(data) => {
            createReviewMutation.mutate({
              jobId: selectedBookingForReview.requestId,
              reviewedBy: 'customer',
              ...data,
            })
          }}
          onClose={() => setSelectedBookingForReview(null)}
        />
      )}
    </div>
  )
}

// Provider Trust Score Component
function ProviderTrustScore({ providerId }: { providerId: number }) {
  const { data: trustScore, isLoading } = useQuery({
    queryKey: ['trust-score', providerId],
    queryFn: () => trustScoreApi.getByProviderId(providerId),
    enabled: !!providerId,
  })

  if (isLoading || !trustScore) return null

  const score = Math.round(trustScore.trustScore || 0)
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="mt-2 p-2 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600">Trust Score:</span>
        <span className={`text-sm font-bold ${getScoreColor(score)}`}>{score}/100</span>
        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${
              score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${score}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}

// Review Modal Component
function ReviewModal({
  booking,
  reviewForm,
  setReviewForm,
  onSubmit,
  onClose,
}: {
  booking: any
  reviewForm: any
  setReviewForm: (form: any) => void
  onSubmit: (data: any) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Review Service</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">Request #{booking.requestId} - {booking.providerName}</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit(reviewForm)
          }}
          className="p-6 space-y-6"
        >
          {/* Rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Overall Rating *
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                  className={`text-3xl ${
                    star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Selected: {reviewForm.rating} out of 5</p>
          </div>

          {/* Detailed Scores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reliability (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={reviewForm.reliabilityScore}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, reliabilityScore: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quality (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={reviewForm.qualityScore}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, qualityScore: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Communication (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={reviewForm.communicationScore}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, communicationScore: parseInt(e.target.value) || 0 })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Comment (Optional)
            </label>
            <textarea
              value={reviewForm.comment}
              onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Share your experience..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1E40AF] font-semibold"
            >
              Submit Review
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

