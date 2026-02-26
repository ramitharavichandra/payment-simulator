"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SignIn() {

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ if already logged in → dashboard
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.replace("/dashboard");
      }
    };

    checkSession();
  }, [router]);

  // ✅ login logic
  const handleLogin = async () => {

    if (!email || !password) {
      alert("Enter email & password");
      return;
    }

    setLoading(true);

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    console.log("Logged in user:", data.user);

    // ✅ redirect after login
    router.replace("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">

      <div className="w-[380px] border rounded-xl p-8 shadow-md space-y-6">

        <h1 className="text-2xl font-bold text-center">
          Sign In
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
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-center text-sm">
          Don't have an account?{" "}
          <Link href="/signup" className="text-blue-600 font-medium">
            Sign Up
          </Link>
        </p>

      </div>
    </div>
  );
}