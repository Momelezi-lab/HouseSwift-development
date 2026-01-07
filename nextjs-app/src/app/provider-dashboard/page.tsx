"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceRequestApi, providerApi, trustScoreApi, reviewApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export default function ProviderDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    }
  }, []);

  // Fetch provider details
  const { data: providerData } = useQuery({
    queryKey: ["provider", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const providers = await providerApi.getAll();
      return providers.find((p: any) => p.email === user.email);
    },
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (providerData) {
      setProvider(providerData);
    }
  }, [providerData]);

  // Fetch trust score
  const { data: trustScoreData, isLoading: isLoadingTrustScore } = useQuery({
    queryKey: ["trust-score", provider?.id],
    queryFn: async () => {
      if (!provider?.id) return null;
      return await trustScoreApi.getByProviderId(provider.id);
    },
    enabled: !!provider?.id,
  });

  // Fetch available jobs (broadcasted/interested jobs that are not assigned)
  // Show ALL broadcasted/interested jobs to ALL providers - they can show interest
  const { data: availableJobs, isLoading: isLoadingAvailable } = useQuery({
    queryKey: ["available-jobs", provider?.id],
    queryFn: async () => {
      if (!provider?.id) return [];
      const allRequests = await serviceRequestApi.getAll();
      // Filter jobs that are available for interest (broadcasted, interested, or pending)
      // and not already assigned (status must be ASSIGNED or higher to be hidden)
      return allRequests.filter((job: any) => {
        // Hide jobs that are assigned (status = assigned, in_progress, completed)
        if (job.assignedProviderId) return false;
        if (
          ["assigned", "in_progress", "completed", "cancelled"].includes(
            job.status
          )
        )
          return false;

        // Only show jobs in broadcastable states
        if (!["pending", "broadcasted", "interested"].includes(job.status))
          return false;

        // Check if this provider already showed interest
        if (job.interestedProviders) {
          try {
            const interested = JSON.parse(job.interestedProviders);
            const alreadyInterested = interested.some(
              (p: any) => p.providerId === provider.id
            );
            // Still show it but mark as already interested
            return true;
          } catch {
            return true;
          }
        }
        return true;
      });
    },
    enabled: !!provider?.id,
    // Refetch every 5 seconds to get real-time updates
    refetchInterval: 5000,
  });

  // Fetch provider's accepted jobs
  const { data: acceptedJobs, isLoading: isLoadingAccepted } = useQuery({
    queryKey: ["provider-jobs", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allRequests = await serviceRequestApi.getAll();
      return allRequests.filter((job: any) => job.providerEmail === user.email);
    },
    enabled: !!user?.email,
  });

  // Show interest mutation - adds provider to interested list (does NOT auto-assign)
  const showInterestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      if (!provider?.id) {
        throw new Error("Provider not found");
      }
      // Use the show interest endpoint
      const response = await fetch(
        `/api/service-requests/${requestId}/show-interest`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerId: provider.id }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to show interest");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["available-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["provider-jobs"] });
    },
    onError: (error: any) => {
      console.error("Show interest error:", error);
      // Show error message to user
      alert(
        error.message ||
          "Failed to show interest. You may have already shown interest."
      );
    },
  });

  // Helper function to check if provider already showed interest
  const hasShownInterest = (job: any) => {
    if (!job.interestedProviders || !provider?.id) return false;
    try {
      const interested = JSON.parse(job.interestedProviders);
      return interested.some((p: any) => p.providerId === provider.id);
    } catch {
      return false;
    }
  };

  // Confirm completion mutation
  const confirmCompletionMutation = useMutation({
    mutationFn: (requestId: number) => serviceRequestApi.confirmCompletion(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-jobs"] });
      alert("Completion confirmed successfully!");
    },
    onError: (error: any) => {
      alert(error.message || "Failed to confirm completion");
    },
  });

  // Fetch reviews for provider's jobs
  const { data: providerReviews } = useQuery({
    queryKey: ["provider-reviews", provider?.id],
    queryFn: async () => {
      if (!provider?.id) return [];
      return await reviewApi.getAll({ providerId: provider.id });
    },
    enabled: !!provider?.id,
  });

  // Calculate revenue and next payout
  const calculateStats = () => {
    if (!acceptedJobs)
      return { totalRevenue: 0, nextPayout: null, completedJobs: 0 };

    const completedJobs = acceptedJobs.filter(
      (job: any) => job.status === "completed" || job.status === "confirmed"
    );

    const totalRevenue = completedJobs.reduce((sum: number, job: any) => {
      return sum + (job.totalProviderPayout || 0);
    }, 0);

    // Calculate next weekly payout (every Monday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;
    const nextPayout = new Date(today);
    nextPayout.setDate(today.getDate() + daysUntilMonday);
    nextPayout.setHours(0, 0, 0, 0);

    return { totalRevenue, nextPayout, completedJobs: completedJobs.length };
  };

  const { totalRevenue, nextPayout, completedJobs } = calculateStats();

  const formatDate = (date: string | Date) => {
    if (!date) return "N/A";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (time: string) => {
    if (!time) return "N/A";
    return time.substring(0, 5); // HH:MM format
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Please log in to view your dashboard
          </p>
          <Link
            href="/login"
            className="inline-block bg-[#2563EB] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#1E40AF] transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (user.role !== "provider") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            This page is only for service providers
          </p>
          <Link
            href="/profile"
            className="inline-block bg-[#2563EB] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#1E40AF] transition-all"
          >
            Go to Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#2563EB] text-white py-12 px-4 shadow-2xl">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 font-semibold"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2">
            Provider Dashboard
          </h1>
          <p className="text-xl text-white/90">
            {provider?.name || user.name} -{" "}
            {provider?.serviceType || "Service Provider"}
          </p>
        </div>
      </header>

      {/* Stats Cards */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Trust Score Card */}
          <div className="bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] rounded-2xl p-6 text-white shadow-xl">
            <h3 className="text-sm font-semibold text-white/90 mb-2">
              Trust Score
            </h3>
            {isLoadingTrustScore ? (
              <div className="animate-pulse">
                <div className="h-8 bg-white/20 rounded mb-2"></div>
                <div className="h-4 bg-white/20 rounded w-3/4"></div>
              </div>
            ) : trustScoreData ? (
              <>
                <p className="text-3xl font-bold">
                  {Math.round(trustScoreData.trustScore || 0)}
                </p>
                <div className="mt-2">
                  <div className="w-full bg-white/20 rounded-full h-2 mb-1">
                    <div
                      className="bg-white rounded-full h-2 transition-all"
                      style={{
                        width: `${trustScoreData.trustScore || 0}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-white/80">
                    {trustScoreData.totalJobs || 0} jobs •{" "}
                    {Math.round((trustScoreData.completionRate || 0) * 100)}% completion
                  </p>
                </div>
              </>
            ) : (
              <p className="text-lg">Not available</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-[#2563EB] to-[#1E40AF] rounded-2xl p-6 text-white shadow-xl">
            <h3 className="text-sm font-semibold text-white/90 mb-2">
              Total Revenue
            </h3>
            <p className="text-3xl font-bold">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-white/80 mt-2">
              {completedJobs} completed jobs
            </p>
          </div>

          <div className="bg-gradient-to-br from-[#10B981] to-[#059669] rounded-2xl p-6 text-white shadow-xl">
            <h3 className="text-sm font-semibold text-white/90 mb-2">
              Next Weekly Payout
            </h3>
            <p className="text-3xl font-bold">
              {nextPayout ? formatDate(nextPayout) : "N/A"}
            </p>
            <p className="text-sm text-white/80 mt-2">
              {nextPayout
                ? `${Math.ceil(
                    (nextPayout.getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )} days`
                : ""}
            </p>
          </div>

          <div className="bg-gradient-to-br from-[#F59E0B] to-[#D97706] rounded-2xl p-6 text-white shadow-xl">
            <h3 className="text-sm font-semibold text-white/90 mb-2">
              Active Jobs
            </h3>
            <p className="text-3xl font-bold">
              {acceptedJobs?.filter(
                (j: any) =>
                  j.status === "confirmed" || j.status === "in_progress"
              ).length || 0}
            </p>
            <p className="text-sm text-white/80 mt-2">In progress</p>
          </div>
        </div>

        {/* Trust Score Details Section */}
        {trustScoreData && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Trust Score Breakdown
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-1">Reliability</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(trustScoreData.reliabilityScore || 0)}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-500 rounded-full h-2"
                    style={{
                      width: `${trustScoreData.reliabilityScore || 0}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round((trustScoreData.completionRate || 0) * 100)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {trustScoreData.completedJobs || 0} / {trustScoreData.totalJobs || 0} jobs
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-1">Cancellation Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round((trustScoreData.cancellationRate || 0) * 100)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {trustScoreData.cancelledJobs || 0} cancelled
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-1">Average Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(trustScoreData.averageRating || 0).toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {trustScoreData.totalReviews || 0} reviews
                </p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your trust score is automatically calculated based on your job performance, 
                completion rate, cancellation rate, customer ratings, and verification status. 
                You cannot manually edit your trust score.
              </p>
            </div>
          </div>
        )}

        {/* Available Jobs Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Available Jobs
          </h2>
          {isLoadingAvailable ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b border-[#2563EB] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading available jobs...</p>
            </div>
          ) : availableJobs && availableJobs.length > 0 ? (
            <div className="space-y-4">
              {availableJobs.map((job: any) => (
                <div
                  key={job.requestId}
                  className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        Request #{job.requestId}
                      </h3>
                      <p className="text-gray-600">
                        {formatDate(job.preferredDate)} at{" "}
                        {formatTime(job.preferredTime)}
                      </p>
                    </div>
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${
                        job.status === "interested"
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : "bg-yellow-100 text-yellow-800 border-yellow-200"
                      }`}
                    >
                      {job.status === "interested"
                        ? "Interested"
                        : job.status === "broadcasted"
                        ? "Available"
                        : "Pending"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Customer</p>
                      <p className="font-semibold text-gray-900">
                        {job.customerName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {job.customerPhone}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Address</p>
                      <p className="font-semibold text-gray-900">
                        {job.customerAddress}
                      </p>
                      {job.unitNumber && (
                        <p className="text-sm text-gray-600">
                          Unit {job.unitNumber}
                        </p>
                      )}
                      {job.complexName && (
                        <p className="text-sm text-gray-600">
                          {job.complexName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Service Details */}
                  {job.selectedItems && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        Service Details:
                      </p>
                      <div className="space-y-1">
                        {(() => {
                          try {
                            const items = JSON.parse(job.selectedItems);
                            return items.map((item: any, idx: number) => (
                              <p key={idx} className="text-sm text-gray-600">
                                • {item.type || item.category} × {item.quantity}
                                {item.is_white && (
                                  <span className="text-[#2563EB]">
                                    {" "}
                                    (White)
                                  </span>
                                )}
                              </p>
                            ));
                          } catch {
                            return (
                              <p className="text-sm text-gray-600">
                                Service details unavailable
                              </p>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Additional Notes */}
                  {job.additionalNotes && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-semibold text-gray-700 mb-1">
                        Additional Notes:
                      </p>
                      <p className="text-sm text-gray-600">
                        {job.additionalNotes}
                      </p>
                    </div>
                  )}

                  {/* Access Instructions */}
                  {job.accessInstructions && (
                    <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm font-semibold text-gray-700 mb-1">
                        Access Instructions:
                      </p>
                      <p className="text-sm text-gray-600">
                        {job.accessInstructions}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Your Payout</p>
                      <p className="text-2xl font-bold text-[#10B981]">
                        {formatCurrency(job.totalProviderPayout || 0)}
                      </p>
                    </div>
                    {hasShownInterest(job) ? (
                      <div className="flex flex-col items-end">
                        <button
                          disabled
                          className="bg-gray-300 text-gray-600 px-6 py-3 rounded-xl font-bold cursor-not-allowed"
                        >
                          Interest Submitted
                        </button>
                        <p className="text-sm text-gray-600 mt-2 text-right">
                          Awaiting confirmation
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Show interest in Request #${job.requestId}?\n\nYour interest will be submitted to admin for review. The job will not be automatically assigned.`
                            )
                          ) {
                            showInterestMutation.mutate(job.requestId);
                          }
                        }}
                        disabled={showInterestMutation.isPending}
                        className="bg-[#2563EB] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#1E40AF] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        {showInterestMutation.isPending
                          ? "Submitting..."
                          : "Accept Job"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-600 text-lg font-semibold">
                No available jobs at the moment
              </p>
              <p className="text-sm text-gray-500 mt-2">
                New service requests will appear here automatically. This page
                refreshes every 5 seconds.
              </p>
            </div>
          )}
        </div>

        {/* Accepted Jobs Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            My Accepted Jobs
          </h2>
          {isLoadingAccepted ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b border-[#2563EB] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your jobs...</p>
            </div>
          ) : acceptedJobs && acceptedJobs.length > 0 ? (
            <div className="space-y-4">
              {acceptedJobs.map((job: any) => (
                <div
                  key={job.requestId}
                  className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        Request #{job.requestId}
                      </h3>
                      <p className="text-gray-600">
                        {formatDate(job.preferredDate)} at{" "}
                        {formatTime(job.preferredTime)}
                      </p>
                    </div>
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${
                        job.status === "completed"
                          ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]"
                          : job.status === "assigned" ||
                            job.status === "confirmed"
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : job.status === "in_progress"
                          ? "bg-purple-100 text-purple-800 border-purple-200"
                          : "bg-yellow-100 text-yellow-800 border-yellow-200"
                      }`}
                    >
                      {job.status === "in_progress"
                        ? "In Progress"
                        : job.status?.charAt(0).toUpperCase() +
                          job.status?.slice(1)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Customer</p>
                      <p className="font-semibold text-gray-900">
                        {job.customerName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {job.customerPhone}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Address</p>
                      <p className="font-semibold text-gray-900">
                        {job.customerAddress}
                      </p>
                      {job.unitNumber && (
                        <p className="text-sm text-gray-600">
                          Unit {job.unitNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Your Payout</p>
                    <p className="text-2xl font-bold text-[#10B981]">
                      {formatCurrency(job.totalProviderPayout || 0)}
                    </p>
                  </div>

                  {/* Completion Confirmation & Review Section */}
                  {(job.status === "assigned" || job.status === "confirmed" || job.status === "in_progress" || job.status === "completed" || job.providerConfirmedCompletion) && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      {/* Completion Confirmation */}
                      {(!job.providerConfirmedCompletion && job.status !== "completed") && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-800 font-semibold mb-2">Confirm Job Completion</p>
                          <p className="text-xs text-blue-600 mb-3">Let us know when you have completed the service.</p>
                          <button
                            onClick={() => {
                              if (confirm("Confirm that you have completed this job?")) {
                                confirmCompletionMutation.mutate(job.requestId);
                              }
                            }}
                            disabled={confirmCompletionMutation.isPending}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 px-4 rounded-lg transition-all"
                          >
                            {confirmCompletionMutation.isPending ? "Confirming..." : "✓ Confirm Completion"}
                          </button>
                        </div>
                      )}

                      {job.providerConfirmedCompletion && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm text-green-800 font-semibold">✓ You confirmed completion</p>
                          {job.customerConfirmedCompletion ? (
                            <p className="text-xs text-green-600 mt-1">Both parties confirmed - Job completed!</p>
                          ) : (
                            <p className="text-xs text-green-600 mt-1">Waiting for customer confirmation</p>
                          )}
                        </div>
                      )}

                      {/* Review Button - Available when at least one party confirmed */}
                      {(job.providerConfirmedCompletion || job.customerConfirmedCompletion || job.status === "completed") && (
                        <div>
                          {providerReviews?.some((r: any) => r.jobId === job.requestId && r.reviewedBy === "provider") ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <p className="text-sm text-green-800 font-semibold">✓ Review Submitted</p>
                              <p className="text-xs text-green-600 mt-1">Thank you for your feedback!</p>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                // TODO: Open review modal for provider to rate customer
                                alert("Review modal for providers coming soon! You can rate the customer here.");
                              }}
                              className="w-full bg-[#2563EB] hover:bg-[#1E40AF] text-white font-semibold py-2 px-4 rounded-lg transition-all"
                            >
                              Rate Customer
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {job.additionalNotes && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">Notes</p>
                      <p className="text-gray-900">{job.additionalNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-600">You haven't accepted any jobs yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Accept jobs from the available jobs section above
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
