"use client"
import { useRouter } from "next/navigation";
import { useState } from "react";
import axios from "axios";
import { Base_url } from "@/app/api/config/BaseUrl";

export default function ClientLogin() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [err, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [email, setEmail] = useState("");
  const [pan, setPan] = useState("");
  const [otp, setOtp] = useState("");
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  const router = useRouter();

  // Handle OTP input changes
  const handleOtpChange = (index: number, value: string) => {
    // Filter to only allow numeric characters
    const numericValue = value.replace(/\D/g, '');
    
    // Only allow single digit
    const digit = numericValue.slice(-1);
    
    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = digit;
    setOtpDigits(newOtpDigits);
    
    // Auto-focus next input
    if (digit && index < 5) {
      setTimeout(() => {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        if (nextInput) nextInput.focus();
      }, 0);
    }
    
    // Update OTP string with the new array
    const newOtp = newOtpDigits.join('');
    setOtp(newOtp);
  };

  // Handle paste event for OTP
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length > 0) {
      const newOtpDigits = [...otpDigits];
      for (let i = 0; i < Math.min(pastedData.length, 6); i++) {
        newOtpDigits[i] = pastedData[i];
      }
      setOtpDigits(newOtpDigits);
      setOtp(newOtpDigits.join(''));
      
      // Focus the next empty input or the last one
      const nextIndex = Math.min(pastedData.length, 5);
      setTimeout(() => {
        const nextInput = document.getElementById(`otp-${nextIndex}`);
        if (nextInput) nextInput.focus();
      }, 0);
    }
  };

  // Handle backspace in OTP input
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (otpDigits[index]) {
        // Clear current input
        const newOtpDigits = [...otpDigits];
        newOtpDigits[index] = '';
        setOtpDigits(newOtpDigits);
        setOtp(newOtpDigits.join(''));
      } else if (index > 0) {
        // Move to previous input and clear it
        const prevInput = document.getElementById(`otp-${index - 1}`);
        if (prevInput) {
          const newOtpDigits = [...otpDigits];
          newOtpDigits[index - 1] = '';
          setOtpDigits(newOtpDigits);
          setOtp(newOtpDigits.join(''));
          prevInput.focus();
        }
      }
    }
  };

  // Generate OTP
  const handleGenerateOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pan.trim()) {
      setError("PAN is required");
      return;
    }

    // PAN validation (10 characters, alphanumeric)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(pan.trim().toUpperCase())) {
      setError("Please enter a valid PAN (e.g., ABCDE1234F)");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(`${Base_url}client-auth/generate-otp`, {
        pan: pan.trim().toUpperCase()
      });

      if (response.data && response.data.success) {
        // Extract email from response
        const clientEmail = response.data.data?.email || email;
        setEmail(clientEmail);
        setSuccess("OTP sent successfully! Please check your email.");
        setStep('otp');
      }
    } catch (error: any) {
      console.error("Generate OTP error:", error);
      if (error.response?.status === 404) {
        setError("Client not found. Please contact your administrator.");
      } else {
        setError(error.response?.data?.message || "Failed to send OTP. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP and login
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure OTP is exactly 6 digits
    const otpString = otpDigits.join('');
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }
    
    // Update OTP state to ensure consistency
    setOtp(otpString);

    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post(`${Base_url}client-auth/verify-otp`, {
        email: email.trim(),
        pan: pan.trim().toUpperCase(),
        otp: otp
      });

      if (response.data && response.data.success) {
        const { client, access } = response.data.data;
        
        console.log('Login successful:', { client, access });
        
        // Store client data and token
        localStorage.setItem("clientToken", access.token);
        localStorage.setItem("clientData", JSON.stringify(client));
        
        // Navigate to client dashboard
        window.location.href = "/client-dashboard";
      }
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      if (error.response?.status === 400) {
        setError("Invalid OTP. Please try again.");
        // Clear OTP inputs
        setOtpDigits(['', '', '', '', '', '']);
        setOtp("");
      } else {
        setError(error.response?.data?.message || "Failed to verify OTP. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(`${Base_url}client-auth/generate-otp`, {
        pan: pan.trim().toUpperCase()
      });

      if (response.data && response.data.success) {
        // Extract email from response
        const clientEmail = response.data.data?.email || email;
        setEmail(clientEmail);
        setSuccess("OTP resent successfully! Please check your email.");
        // Clear previous OTP
        setOtpDigits(['', '', '', '', '', '']);
        setOtp("");
      }
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      setError(error.response?.data?.message || "Failed to resend OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6" style={{ background: "rgb(240 241 247)" }}>
      <div className="w-full max-w-md min-w-0">
        <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden">
          <div className="p-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full shrink-0" />
              <div className="flex items-center gap-2">
                <i className="ri-user-line text-purple-600 text-lg" />
                <span className="text-sm font-bold text-gray-800">Client Portal</span>
              </div>
            </div>
          </div>

          <div className="p-6 pt-4">
            {step === "email" ? (
              <>
                <h1 className="text-sm font-bold text-gray-800 mb-1 text-center">Client Login</h1>
                <p className="text-[11px] text-[#495057] text-center mb-4">
                  Enter your PAN number to receive a one-time password
                </p>
                {err && (
                  <div className="mb-4 p-3 rounded border border-red-100 bg-red-50 text-red-600 text-[11px] font-medium" role="alert">
                    {err}
                  </div>
                )}
                <form onSubmit={handleGenerateOtp} className="space-y-4">
                  <div>
                    <label htmlFor="client-pan" className="block text-[11px] font-medium text-[#495057] mb-1.5">
                      PAN Number
                    </label>
                    <input
                      type="text"
                      name="pan"
                      id="client-pan"
                      value={pan}
                      onChange={(e) => setPan(e.target.value.toUpperCase())}
                      placeholder="Enter your PAN (e.g., ABCDE1234F)"
                      maxLength={10}
                      required
                      className="w-full min-h-[2.75rem] bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-2.5 leading-normal focus:ring-0 focus:border-purple-300 placeholder:text-gray-400 box-border uppercase"
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
                    onClick={() => {
                      setStep("email");
                      setError("");
                      setSuccess("");
                      setOtpDigits(["", "", "", "", "", ""]);
                      setOtp("");
                      setPan("");
                      setEmail("");
                    }}
                    className="text-[11px] font-medium text-gray-500 hover:text-gray-700"
                  >
                    ← Back to PAN
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
