"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SignUp() {

  const router = useRouter();

  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");

  const handleSignup = async () => {

    const { data, error } =
      await supabase.auth.signUp({
        email,
        password,
      });

    if (error) {
      alert(error.message);
      return;
    }

    alert("User created ✅");

    // ✅ go to dashboard
    router.replace("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">

      <div className="w-[380px] border rounded-xl p-8 shadow-md space-y-6">

        <h1 className="text-2xl font-bold text-center">
          Sign Up
        </h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-3 rounded-md"
          onChange={(e)=>setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-3 rounded-md"
          onChange={(e)=>setPassword(e.target.value)}
        />

        <button
          onClick={handleSignup}
          className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700"
        >
          Sign Up
        </button>

      </div>
    </div>
  );
}