"use client"
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import axios from "axios";
import { Base_url } from "@/app/api/config/BaseUrl";
import { auth } from "@/shared/firebase/firebaseapi";

export default function Home() {
  const [passwordshow1, setpasswordshow1] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setError] = useState("");
  const [data, setData] = useState({ email: "", password: "" });
  const { email, password } = data;
  const router = useRouter();

  const changeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
    setError("");
  };

  const Login = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    auth
      .signInWithEmailAndPassword(email, password)
      .then(() => RouteChange())
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  };

  const Login1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!password.trim()) {
      setError("Password is required");
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(`${Base_url}auth/login`, {
        email: data.email,
        password: data.password,
      });
      if (response.data) {
        const { user, tokens } = response.data;
        localStorage.setItem("token", tokens.access.token);
        localStorage.setItem("refreshToken", tokens.refresh.token);
        localStorage.setItem("user", JSON.stringify(user));
        window.location.href = "/dashboard";
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        setError("Invalid email or password");
      } else {
        setError(
          error.response?.data?.message || "Login failed. Please try again later."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const RouteChange = () => router.push("/dashboard");

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "rgb(240 241 247)" }}
    >
      <div className="w-full max-w-[400px]">
        {/* Card per UI spec: bg-white shadow-sm border border-gray-100 */}
        <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
          <div className="p-[10px] sm:p-6">
            {/* Title strip: accent bar + title (spec: 14px bold gray-800) */}
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-[3px] h-5 rounded-full flex-shrink-0"
                style={{ backgroundColor: "#6D28D9" }}
              />
              <h1 className="text-sm font-bold text-gray-800">Sign In</h1>
            </div>
            <p className="text-[11px] font-medium text-[#949EB7] mb-5 ml-5">
              Welcome back
            </p>

            {err && (
              <div
                className="mb-4 p-3 rounded border bg-[#FEF2F2] border-[#FEE2E2] text-[#DC2626] text-[11px] font-medium"
                role="alert"
              >
                {err}
              </div>
            )}

            <form onSubmit={Login1} className="space-y-4">
              <div>
                <label
                  htmlFor="signin-email"
                  className="block text-[11px] font-medium text-[#495057] mb-1.5"
                >
                  Email
                </label>
                <input
                  type="text"
                  name="email"
                  id="signin-email"
                  value={email}
                  onChange={changeHandler}
                  placeholder="you@example.com"
                  className="w-full bg-white border border-gray-200 text-[11px] font-medium text-[#495057] pl-3 pr-3 py-2 rounded focus:ring-0 focus:border-purple-300 placeholder:text-gray-400 transition-all"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="signin-password"
                    className="block text-[11px] font-medium text-[#495057]"
                  >
                    Password
                  </label>
                  <Link
                    href="#!"
                    className="text-[11px] font-medium text-[#DC2626] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="flex rounded border border-gray-200 focus-within:border-purple-300 transition-colors overflow-hidden">
                  <input
                    name="password"
                    type={passwordshow1 ? "text" : "password"}
                    id="signin-password"
                    value={password}
                    onChange={changeHandler}
                    placeholder="••••••••"
                    className="flex-1 min-w-0 bg-white text-[11px] font-medium text-[#495057] pl-3 py-2 focus:ring-0 focus:outline-none placeholder:text-gray-400 border-0"
                  />
                  <button
                    type="button"
                    onClick={() => setpasswordshow1(!passwordshow1)}
                    aria-label={passwordshow1 ? "Hide password" : "Show password"}
                    className="flex items-center justify-center w-10 h-[2.25rem] bg-gray-50 border-l border-gray-200 text-[#495057] hover:bg-gray-100 hover:text-gray-800 transition-colors shrink-0"
                  >
                    <i className={`text-base ${passwordshow1 ? "ti ti-eye-off" : "ti ti-eye"}`} />
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Portal links – secondary style per spec */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-[11px] font-medium text-[#7987A1] mb-3 text-center">
                Access other portals
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Link
                  href="/client-login"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded bg-white border border-gray-200 text-[#495057] hover:bg-gray-50 shadow-sm transition-colors"
                >
                  <i className="ri-user-line text-xs" />
                  Client Portal
                </Link>
                <Link
                  href="/team-member-login"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded bg-white border border-gray-200 text-[#495057] hover:bg-gray-50 shadow-sm transition-colors"
                >
                  <i className="ri-team-line text-xs" />
                  Team Portal
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
