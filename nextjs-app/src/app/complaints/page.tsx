"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function ComplaintsPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type: "",
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const complaintMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/complaints", data),
    onSuccess: () => {
      alert("Complaint submitted successfully!");
      setFormData({
        name: "",
        email: "",
        type: "",
        title: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || "Failed to submit complaint");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    complaintMutation.mutate(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Force input text to be visible after render - Chrome specific fix
  useEffect(() => {
    const forceInputColors = () => {
      const inputs = document.querySelectorAll("input, textarea, select");
      inputs.forEach((input) => {
        if (input instanceof HTMLElement) {
          // Remove any existing color styles first
          input.style.removeProperty("color");
          input.style.removeProperty("background-color");
          input.style.removeProperty("-webkit-text-fill-color");
          input.style.removeProperty("caret-color");

          // Force black text with highest priority
          input.style.setProperty("color", "#000000", "important");
          input.style.setProperty("background-color", "#ffffff", "important");
          input.style.setProperty(
            "-webkit-text-fill-color",
            "#000000",
            "important"
          );
          input.style.setProperty("caret-color", "#000000", "important");

          // Chrome-specific: Also set the actual style attribute directly
          (input as any).style.color = "#000000";
          (input as any).style.backgroundColor = "#ffffff";
          (input as any).style.webkitTextFillColor = "#000000";
          (input as any).style.caretColor = "#000000";
        }
      });
    };

    // Run immediately
    forceInputColors();

    // Run after delays to catch any late style applications
    const timeouts = [
      setTimeout(forceInputColors, 50),
      setTimeout(forceInputColors, 100),
      setTimeout(forceInputColors, 300),
      setTimeout(forceInputColors, 500),
    ];

    // Watch for any style changes and reapply
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "style"
        ) {
          forceInputColors();
        }
      });
    });

    // Observe all inputs for style changes
    const inputs = document.querySelectorAll("input, textarea, select");
    inputs.forEach((input) => {
      observer.observe(input, {
        attributes: true,
        attributeFilter: ["style", "class"],
      });
    });

    return () => {
      timeouts.forEach(clearTimeout);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* Chrome-specific input text fix */
        input[type="text"],
        input[type="email"],
        input[type="password"],
        input[type="tel"],
        input[type="number"],
        input[type="date"],
        textarea,
        select {
          color: #000000 !important;
          background-color: #ffffff !important;
          -webkit-text-fill-color: #000000 !important;
          caret-color: #000000 !important;
          opacity: 1 !important;
          -webkit-opacity: 1 !important;
        }
        /* Chrome autofill - very aggressive */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active,
        textarea:-webkit-autofill,
        textarea:-webkit-autofill:hover,
        textarea:-webkit-autofill:focus,
        textarea:-webkit-autofill:active {
          -webkit-text-fill-color: #000000 !important;
          -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
          box-shadow: 0 0 0px 1000px #ffffff inset !important;
          color: #000000 !important;
          background-color: #ffffff !important;
          transition: background-color 5000s ease-in-out 0s !important;
        }
        /* Force override any inherited colors */
        * input,
        * textarea,
        * select {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
        }
      `,
        }}
      />
      <div className="min-h-screen bg-white">
        <header className="bg-[#1A531A] text-white py-12 px-4 shadow-2xl">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 font-semibold"
            >
              ← Back to Home
            </Link>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-2">
              Submit a Complaint
            </h1>
            <p className="text-xl text-white/90">
              We take your feedback seriously
            </p>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    autoComplete="off"
                    style={
                      {
                        color: "rgb(0, 0, 0)",
                        backgroundColor: "rgb(255, 255, 255)",
                        WebkitTextFillColor: "rgb(0, 0, 0)",
                        caretColor: "rgb(0, 0, 0)",
                      } as React.CSSProperties
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A531A] focus:border-[#1A531A] transition-all text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="off"
                    style={
                      {
                        color: "rgb(0, 0, 0)",
                        backgroundColor: "rgb(255, 255, 255)",
                        WebkitTextFillColor: "rgb(0, 0, 0)",
                        caretColor: "rgb(0, 0, 0)",
                      } as React.CSSProperties
                    }
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1A531A] focus:border-[#1A531A] transition-all text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Complaint Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  autoComplete="off"
                  style={
                    {
                      color: "rgb(0, 0, 0)",
                      backgroundColor: "rgb(255, 255, 255)",
                      WebkitTextFillColor: "rgb(0, 0, 0)",
                    } as React.CSSProperties
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
                >
                  <option value="">Select type</option>
                  <option value="service">Service Quality</option>
                  <option value="provider">Service Provider</option>
                  <option value="billing">Billing Issue</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  autoComplete="off"
                  style={{
                    color: "rgb(0, 0, 0)",
                    backgroundColor: "rgb(255, 255, 255)",
                    WebkitTextFillColor: "rgb(0, 0, 0)",
                    caretColor: "rgb(0, 0, 0)",
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={6}
                  autoComplete="off"
                  style={{
                    color: "rgb(0, 0, 0)",
                    backgroundColor: "rgb(255, 255, 255)",
                    WebkitTextFillColor: "rgb(0, 0, 0)",
                    caretColor: "rgb(0, 0, 0)",
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Date of Incident *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  autoComplete="off"
                  style={{
                    color: "rgb(0, 0, 0)",
                    backgroundColor: "rgb(255, 255, 255)",
                    WebkitTextFillColor: "rgb(0, 0, 0)",
                    caretColor: "rgb(0, 0, 0)",
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={complaintMutation.isPending}
                className="w-full bg-[#1A531A] text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-[#1A531A]/90 hover:shadow-2xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:transform-none"
              >
                {complaintMutation.isPending
                  ? "Submitting..."
                  : "Submit Complaint"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
