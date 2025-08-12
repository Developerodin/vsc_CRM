"use client"
import { basePath } from "@/next.config";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import { Base_url } from "@/app/api/config/BaseUrl";

export default function ClientLogin() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [err, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  const router = useRouter();

  // Handle OTP input changes
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = value;
    setOtpDigits(newOtpDigits);
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
    
    // Update OTP string with the new array
    const newOtp = newOtpDigits.join('');
    setOtp(newOtp);
  };

  // Handle backspace in OTP input
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Generate OTP
  const handleGenerateOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(`${Base_url}client-auth/generate-otp`, {
        email: email.trim()
      });

      if (response.data && response.data.success) {
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
        email: email.trim()
      });

      if (response.data && response.data.success) {
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
    <div className="container">
      <div className="flex justify-center authentication authentication-basic items-center h-full text-defaultsize text-defaulttextcolor">
        <div className="grid grid-cols-12">
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-3 sm:col-span-2"></div>
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-6 sm:col-span-8 col-span-12">
            <div className="box !p-4 sm:!p-6 lg:!p-[3rem]">
              <nav className="!block px-2 sm:px-6 mx-auto" aria-label="Tabs" role="tablist">
                <div className="flex justify-center space-x-2 bg-light p-2 rounded-md rtl:space-x-reverse">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <i className="ri-user-line text-primary text-lg sm:text-xl"></i>
                    <span className="font-semibold text-primary text-sm sm:text-base">Client Portal</span>
                  </div>
                </div>
              </nav>

              <div className="box-body">
                {step === 'email' ? (
                  <>
                    <p className="h5 font-semibold mb-2 text-center text-lg sm:text-xl">Client Login</p>
                    {err && (
                      <div className="p-4 mb-4 bg-danger/40 text-sm border-t-4 border-danger text-danger/60 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
                        {err}
                      </div>
                    )}
                    <p className="mb-4 text-[#8c9097] dark:text-white/50 opacity-[0.7] font-normal text-center">
                      Enter your email to receive a one-time password
                    </p>
                    
                    <form onSubmit={handleGenerateOtp}>
                      <div className="grid grid-cols-12 gap-y-4">
                        <div className="xl:col-span-12 col-span-12">
                          <label htmlFor="client-email" className="form-label text-default">Email Address</label>
                                                     <input 
                             type="email" 
                             name="email" 
                             className="form-control w-full !rounded-md h-9 sm:h-10 md:h-12 text-sm sm:text-base" 
                             id="client-email" 
                             value={email}
                             onChange={(e) => setEmail(e.target.value)}
                             placeholder="Enter your email address"
                             required
                           />
                        </div>
                        <div className="xl:col-span-12 col-span-12 grid mt-2">
                                                     <button 
                             type="submit"
                             className="ti-btn ti-btn-primary !bg-primary !text-white !font-medium h-9 sm:h-10 md:h-12 text-sm sm:text-base"
                             disabled={isLoading}
                           >
                             {isLoading ? "Sending OTP..." : "Send OTP"}
                           </button>
                        </div>
                      </div>
                    </form>
                  </>
                ) : (
                  <>
                    <p className="h5 font-semibold mb-2 text-center text-lg sm:text-xl">Enter OTP</p>
                    {err && (
                      <div className="p-4 mb-4 bg-danger/40 text-sm border-t-4 border-danger text-danger/60 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
                        {err}
                      </div>
                    )}
                    {success && (
                      <div className="p-4 mb-4 bg-success text-sm border-t-4 border-success text-white rounded-lg" role="alert">
                        {success}
                      </div>
                    )}
                    <p className="mb-4 text-[#8c9097] dark:text-white/50 opacity-[0.7] font-normal text-center">
                      We've sent a 6-digit code to <strong>{email}</strong>
                    </p>
                    
                    <form onSubmit={handleVerifyOtp}>
                      <div className="grid grid-cols-12 gap-y-4">
                        <div className="xl:col-span-12 col-span-12">
                          <label className="form-label text-default">Enter 6-digit OTP</label>
                                                                                <div className="grid grid-cols-6 gap-1 sm:gap-2 md:gap-3 mb-4 max-w-xs mx-auto">
                             {otpDigits.map((digit, index) => (
                               <input
                                 key={index}
                                 type="text"
                                 id={`otp-${index}`}
                                 className="form-control w-full aspect-square text-center text-sm sm:text-base md:text-lg font-semibold !rounded-md border-2 focus:border-primary"
                                 value={digit}
                                 onChange={(e) => handleOtpChange(index, e.target.value)}
                                 onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                 maxLength={1}
                                 inputMode="numeric"
                                 pattern="[0-9]*"
                               />
                             ))}
                           </div>
                        </div>
                        <div className="xl:col-span-12 col-span-12 grid mt-2">
                                                     <button 
                             type="submit"
                             className="ti-btn ti-btn-primary !bg-primary !text-white !font-medium h-9 sm:h-10 md:h-12 text-sm sm:text-base"
                             disabled={isLoading || otp.length !== 6}
                           >
                             {isLoading ? "Verifying..." : "Verify & Login"}
                           </button>
                        </div>
                      </div>
                    </form>
                    
                    <div className="text-center mt-4">
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isLoading}
                        className="text-primary hover:text-primary-dark text-sm font-medium disabled:opacity-50"
                      >
                        {isLoading ? "Sending..." : "Resend OTP"}
                      </button>
                    </div>
                    
                    <div className="text-center mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setStep('email');
                          setError("");
                          setSuccess("");
                          setOtpDigits(['', '', '', '', '', '']);
                          setOtp("");
                        }}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                      >
                        ← Back to Email
                      </button>
                    </div>
                  </>
                )}
                
               
              </div>
            </div>
          </div>
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-3 sm:col-span-2"></div>
        </div>
      </div>
    </div>
  );
}
