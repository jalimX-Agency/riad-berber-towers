"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (res?.ok) router.push("/admin");
    else setError("Email ou mot de passe incorrect.");
  }

  return (
    <main className="min-h-dvh grid place-items-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm grid gap-4 rounded-[--radius-card] border border-rule bg-paper p-8">
        <Image src="/brand/rbt-emblem-color.svg" alt="" width={64} height={71} className="justify-self-center" />
        <h1 className="text-3xl text-center">Administration</h1>
        <label className="grid gap-1 text-sm">
          Email
          <input id="email" name="email" type="email" required autoComplete="username" className="rounded-md border border-rule bg-snow px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Mot de passe
          <input id="password" name="password" type="password" required autoComplete="current-password" className="rounded-md border border-rule bg-snow px-3 py-2" />
        </label>
        {error && <p className="text-sm text-earth" role="alert">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary justify-center">
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
