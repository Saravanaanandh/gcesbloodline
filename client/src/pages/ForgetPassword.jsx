import { useAuthStore } from "@/store/useAuthStore";
import { useRecipientStore } from "@/store/useRecipientStore";
import {
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
    <div className="w-full h-[100vh] bg-black text-white flex flex-col justify-center items-center">
      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="flex flex-col gap-3 mb-5 ">
            <label>Email</label>
            <input
              className="p-2 rounded-md text-white outline-none border-2 border-gray-400"
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3 mb-5 ">
            <label>Enter OTP</label>
            <p>OTP sent to entered email</p>
            <input
              className="p-2 rounded-md text-white outline-none border-2 border-gray-400"
              type="text"
              placeholder="6-digit OTP"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3 mb-5 relative">
            <label>New Password</label>
            <input
              className=" p-2 rounded-md text-white outline-none border-2 border-gray-400"
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div
              className="absolute top-12 right-2"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <Eye className="size-4" />
              ) : (
                <EyeOff className="size-4" />
              )}
            </div>
          </div>
        )}

        <button
  type="submit"
  className="flex gap-3 items-center px-2 py-1 rounded-md bg-purple-800 text-white"
>
  {step === 1 ? (
    isOtpsending ? (
      <div className="flex items-center gap-2">
        <span>Sending...</span>
        <Loader2Icon className="animate-spin"/>
      </div>
    ) : (
      "Next"
    )
  ) : step === 2 ? (
    isOtpVerifing ? (
      <div className="flex items-center gap-2">
        <span>Verifying...</span>
        <Loader2Icon className="animate-spin"/>
      </div>
    ) : (
      "Verify OTP"
    )
  ) : (
    "Reset Password"
  )}

  {step === 1 && !isOtpsending && (
    <ArrowRightIcon />
  )}
</button>

      </form>
    </div>
  );
};

export default ForgetPassword;
