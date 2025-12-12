'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [playerTag, setPlayerTag] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate player tag exists via API
      const validateResponse = await fetch('/api/validate-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerTag }),
      });

      if (!validateResponse.ok) {
        const errorData = await validateResponse.json();
        setError(errorData.error || 'Invalid player tag. Please check and try again.');
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            player_tag: playerTag,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        // Check if email confirmation is required
        // If user is null, it means they need to confirm their email
        if (!data.user || !data.session) {
          setSuccess(true);
        } else {
          // User is already confirmed (shouldn't happen in production with email confirmation enabled)
          router.push('/dashboard');
          router.refresh();
        }
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(`An unexpected error occurred: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-orange-600">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
              <p className="font-semibold">Account created successfully!</p>
              <p className="mt-2">
                Please check your email ({email}) to confirm your account. 
                Click the confirmation link in the email to activate your account.
              </p>
              <p className="mt-2 text-xs">
                If you don't see the email, check your spam folder.
              </p>
            </div>
          )}
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={success}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="relative block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={success}
              />
            </div>
            <div>
              <label htmlFor="playerTag" className="sr-only">
                Clash Royale Player Tag
              </label>
              <input
                id="playerTag"
                name="playerTag"
                type="text"
                required
                className="relative block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Clash Royale Player Tag (e.g. #ABC123)"
                value={playerTag}
                onChange={(e) => setPlayerTag(e.target.value)}
                disabled={success}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || success}
              className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-center text-sm">
            {success ? (
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                After confirming your email, sign in here
              </Link>
            ) : (
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Already have an account? Sign in
              </Link>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

