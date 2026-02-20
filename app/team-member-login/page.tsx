"use client"

import { useState } from "react"
import axios from "axios"
import { Base_url } from "@/app/api/config/BaseUrl"

export default function TeamMemberLogin() {
  const [step, setStep] = useState<"email" | "otp">("email")
  const [isLoading, setIsLoading] = useState(false)
  const [err, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""])

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1)
    const newOtpDigits = [...otpDigits]
    newOtpDigits[index] = digit
    setOtpDigits(newOtpDigits)
    setOtp(newOtpDigits.join(""))
    if (digit && index < 5) {
      setTimeout(() => document.getElementById(`otp-${index + 1}`)?.focus(), 0)
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted.length) return
    const newOtpDigits = [...otpDigits]
    for (let i = 0; i < Math.min(pasted.length, 6); i++) newOtpDigits[i] = pasted[i]
    setOtpDigits(newOtpDigits)
    setOtp(newOtpDigits.join(""))
    setTimeout(() => document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus(), 0)
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key !== "Backspace") return
    if (otpDigits[index]) {
      const next = [...otpDigits]
      next[index] = ""
      setOtpDigits(next)
      setOtp(next.join(""))
    } else if (index > 0) {
      const next = [...otpDigits]
      next[index - 1] = ""
      setOtpDigits(next)
      setOtp(next.join(""))
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }

  const handleGenerateOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError("Email is required")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address")
      return
    }
    setIsLoading(true)
    setError("")
    setSuccess("")
    try {
      const res = await axios.post(`${Base_url}team-member-auth/generate-otp`, { email: email.trim() })
      if (res.data?.success) {
        setSuccess("OTP sent successfully! Please check your email.")
        setStep("otp")
      }
    } catch (error: any) {
      setError(
        error.response?.status === 404
          ? "Team member not found. Please contact your administrator."
          : error.response?.data?.message || "Failed to send OTP. Please try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const otpString = otpDigits.join("")
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit OTP")
      return
    }
    setOtp(otpString)
    setIsLoading(true)
    setError("")
    try {
      const res = await axios.post(`${Base_url}team-member-auth/verify-otp`, {
        email: email.trim(),
        otp: otpString,
      })
      if (res.data?.success) {
        const { teamMember, tokens } = res.data.data
        localStorage.setItem("teamMemberToken", tokens.access.token)
        localStorage.setItem("teamMemberRefreshToken", tokens.refresh.token)
        localStorage.setItem("teamMemberData", JSON.stringify(teamMember))
        window.location.href = "/team-member-dashboard"
      }
    } catch (error: any) {
      setError(
        error.response?.status === 400
          ? "Invalid OTP. Please try again."
          : error.response?.data?.message || "Failed to verify OTP. Please try again."
      )
      if (error.response?.status === 400) {
        setOtpDigits(["", "", "", "", "", ""])
        setOtp("")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setIsLoading(true)
    setError("")
    setSuccess("")
    try {
      const res = await axios.post(`${Base_url}team-member-auth/generate-otp`, { email: email.trim() })
      if (res.data?.success) {
        setSuccess("OTP resent successfully! Please check your email.")
        setOtpDigits(["", "", "", "", "", ""])
        setOtp("")
      }
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to resend OTP. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const goBackToEmail = () => {
    setStep("email")
    setError("")
    setSuccess("")
    setOtpDigits(["", "", "", "", "", ""])
    setOtp("")
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6" style={{ background: "rgb(240 241 247)" }}>
      <div className="w-full max-w-md min-w-0">
        {/* Card */}
        <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
          {/* Header with accent */}
          <div className="p-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" />
              <div className="flex items-center gap-2">
                <i className="ri-team-line text-purple-600 text-lg" />
                <span className="text-sm font-bold text-gray-800">Team Member Portal</span>
              </div>
            </div>
          </div>

          <div className="p-6 pt-4">
            {step === "email" ? (
              <>
                <h1 className="text-sm font-bold text-gray-800 mb-1 text-center">Team Member Login</h1>
                <p className="text-[11px] text-[#495057] text-center mb-4">
                  Enter your email to receive a one-time password
                </p>
                {err && (
                  <div className="mb-4 p-3 rounded border border-red-100 bg-red-50 text-red-600 text-[11px] font-medium" role="alert">
                    {err}
                  </div>
                )}
                <form onSubmit={handleGenerateOtp} className="space-y-4">
                  <div>
                    <label htmlFor="team-member-email" className="block text-[11px] font-medium text-[#495057] mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="team-member-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                      className="w-full min-h-[2.75rem] bg-white border border-gray-200 text-[#495057] text-[11px] sm:text-xs font-medium rounded px-3 py-2.5 leading-normal focus:ring-0 focus:border-purple-300 placeholder:text-gray-400 box-border"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? "Sending OTP..." : "Send OTP"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h1 className="text-sm font-bold text-gray-800 mb-1 text-center">Enter OTP</h1>
                <p className="text-[11px] text-[#495057] text-center mb-4">
                  We&apos;ve sent a 6-digit code to <strong className="text-gray-900">{email}</strong>
                </p>
                {err && (
                  <div className="mb-4 p-3 rounded border border-red-100 bg-red-50 text-red-600 text-[11px] font-medium" role="alert">
                    {err}
                  </div>
                )}
                {success && (
                  <div className="mb-4 p-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-medium" role="alert">
                    {success}
                  </div>
                )}
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#495057] mb-1.5">Enter 6-digit OTP</label>
                    <div className="grid grid-cols-6 gap-1.5 sm:gap-2 w-full max-w-[280px] sm:max-w-[260px] mx-auto">
                      {otpDigits.map((digit, i) => (
                        <input
                          key={i}
                          type="tel"
                          id={`otp-${i}`}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          onPaste={handleOtpPaste}
                          maxLength={1}
                          inputMode="numeric"
                          autoComplete="off"
                          className="w-full min-w-0 h-12 sm:h-11 py-2 px-1 text-center text-xl sm:text-2xl font-bold rounded border-2 border-gray-300 bg-white text-gray-900 focus:ring-0 focus:border-purple-500 focus:outline-none box-border"
                          style={{ lineHeight: 1.2 }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || otpDigits.join("").length !== 6}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded bg-purple-600 text-white hover:bg-purple-700 shadow-sm disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? "Verifying..." : "Verify & Login"}
                  </button>
                </form>
                <div className="flex flex-col items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="text-[11px] font-bold text-purple-600 hover:text-purple-700 disabled:opacity-50"
                  >
                    {isLoading ? "Sending..." : "Resend OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={goBackToEmail}
                    className="text-[11px] font-medium text-gray-500 hover:text-gray-700"
                  >
                    ← Back to Email
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
