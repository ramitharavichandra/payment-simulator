"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Support() {
  const router = useRouter();

  const [issueType, setIssueType] = useState("Payment Issue");
  const [description, setDescription] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/signin");
      return;
    }

    const { error } = await supabase.from("support_queries").insert([
      {
        user_id: user.id,
        issue_type: issueType,
        message: description,
        contact_number: contactNumber,
        contact_email: contactEmail,
      },
    ]);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setDescription("");
    setContactNumber("");
    setContactEmail("");
    setSuccess("Query submitted successfully!");
  };

  return (
    <div className="min-h-screen bg-[#080810] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-[#111120] border border-violet-500/20 p-8 rounded-2xl">

        <h1 className="text-2xl font-bold mb-6 text-violet-400">
          Support & Query
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Issue Type Dropdown */}
          <select
            className="bg-black border border-zinc-700 p-3 rounded-lg outline-none focus:border-violet-500"
            value={issueType}
            onChange={(e) => setIssueType(e.target.value)}
          >
            <option>Payment Issue</option>
            <option>Transaction Failed</option>
            <option>Account Problem</option>
            <option>Security Concern</option>
            <option>Other</option>
          </select>

          {/* Description */}
          <textarea
            placeholder={
              issueType === "Other"
                ? "Please describe your issue in detail..."
                : "Briefly describe the issue..."
            }
            className="bg-black border border-zinc-700 p-3 rounded-lg h-32 outline-none focus:border-violet-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          {/* Contact Number */}
          <input
            type="tel"
            placeholder="Contact Number"
            className="bg-black border border-zinc-700 p-3 rounded-lg outline-none focus:border-violet-500"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            required
          />

          {/* Contact Email */}
          <input
            type="email"
            placeholder="Contact Email"
            className="bg-black border border-zinc-700 p-3 rounded-lg outline-none focus:border-violet-500"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />

          <button
            type="submit"
            className="bg-violet-600 hover:bg-violet-700 p-3 rounded-lg font-semibold transition"
          >
            {loading ? "Submitting..." : "Submit Query"}
          </button>

          {success && (
            <p className="text-green-400 text-sm mt-2">
              {success}
            </p>
          )}

        </form>
      </div>
    </div>
  );
}