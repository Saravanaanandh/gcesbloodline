import { useAuthStore } from "@/store/useAuthStore";
import { useRecipientStore } from "@/store/useRecipientStore";
import {
  ArrowLeft,
  ArrowRightIcon,
  Eye,
  EyeOff,
  Loader,
  Loader2Icon,
  LoaderCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";

const ForgetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");

  const {
    sendOTPForPasswordReset,
    verifyOTPForPasswordReset,
    resetPassword,
    otpSent,
    otpVerified,
    isOtpsending,
    isOtpVerifing,
  } = useAuthStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const stepFromUrl = Number(searchParams.get("step")) || 1;

  const [step, setStep] = useState(stepFromUrl);

  const navigate = useNavigate();
  useEffect(() => {
    if (!email) {
      setStep(1);
      setSearchParams({ step: 1 });
      return;
    }
    if (otpSent) {
      setStep(2);
    }
    if (otpVerified) {
      setStep(3);
    }
    setSearchParams({ step });
  }, [step, otpSent, otpVerified, setSearchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (step === 1) {
      if (!email) {
        setStep(1);
        return;
      }
      await sendOTPForPasswordReset(email);
    } else if (step === 2) {
      if (!email) {
        setStep(1);
        return;
      }
      if (!otp) return toast.error("Please enter OTP!");
      if (otp.length !== 6) return toast.error("OTP Must be 6 digits");
      if (!/^\d{6}$/.test(otp)) return toast.error("Invalid OTP");
      await verifyOTPForPasswordReset(email, otp);
    } else if (step === 3) {
      if (!email) {
        setStep(1);
        return;
      }
      await resetPassword(email, password);
      navigate("/login");
    }
  }; 
  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col justify-center items-center px-4 sm:px-0">
      <form onSubmit={handleSubmit} className="border p-6 sm:p-8 rounded-xl w-full max-w-[90vw] sm:max-w-md shadow-lg shadow-gray-800 flex flex-col bg-gray-950/80 backdrop-blur-sm border-gray-800">
        <h2 className="text-2xl font-bold mb-6 text-center text-purple-400">
          Reset Password
        </h2>

        {step === 1 && (
          <div className="flex flex-col gap-3 mb-6 w-full">
            <label className="text-gray-300">Email Address</label>
            <input
              className="p-3 bg-gray-900 rounded-md text-white outline-none border border-gray-700 focus:border-purple-500 transition-colors w-full"
              type="email"
              placeholder="Enter your email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3 mb-6 w-full">
            <label className="text-gray-300">Enter OTP</label>
            <p className="text-sm text-gray-500">OTP sent to entered email</p>
            <input
              className="p-3 bg-gray-900 rounded-md text-white outline-none border border-gray-700 focus:border-purple-500 transition-colors w-full tracking-widest text-center text-lg"
              type="text"
              placeholder="6-digit OTP"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3 mb-6 relative w-full">
            <label className="text-gray-300">New Password</label>
            <input
              className="p-3 bg-gray-900 rounded-md text-white outline-none border border-gray-700 focus:border-purple-500 transition-colors w-full pr-10"
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div
              className="absolute top-[42px] right-3 cursor-pointer text-gray-400 hover:text-white transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <Eye className="size-5" />
              ) : (
                <EyeOff className="size-5" />
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-2">
          <button type="button" onClick={(e)=> { e.preventDefault();navigate('/')}}
            className="flex gap-2 items-center px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg border border-gray-700 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors cursor-pointer text-sm sm:text-base"
            >
            <ArrowLeft className="size-4 sm:size-5"/> Back
          </button>
          <button
            type="submit"
            className="flex gap-2 items-center px-4 py-2 sm:px-6 sm:py-2.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white transition-all cursor-pointer font-medium text-sm sm:text-base"
          >
            {step === 1 ? (
              isOtpsending ? (
                <div className="flex items-center gap-2">
                  <span>Sending...</span>
                  <Loader2Icon className="animate-spin size-4"/>
                </div>
              ) : (
                "Next"
              )
            ) : step === 2 ? (
              isOtpVerifing ? (
                <div className="flex items-center gap-2">
                  <span>Verifying...</span>
                  <Loader2Icon className="animate-spin size-4"/>
                </div>
              ) : (
                "Verify OTP"
              )
            ) : (
              "Reset Password"
            )}

            {step === 1 && !isOtpsending && (
              <ArrowRightIcon className="size-4 sm:size-5" />
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default ForgetPassword;
