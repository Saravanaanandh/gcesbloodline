import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
    AlertCircle, ArrowLeft, Check, Loader2, Mail, MailCheck, RefreshCw, ShieldCheck, X
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.jsx";

/**
 * The email verification step of signup.
 *
 * Shown instead of the signup form once the server has a pending signup. It holds no signup data
 * of its own - the form stays on the server behind the ticket - which is what makes "Change Email
 * Address" a one-field edit rather than a refill, and what lets the code be resent without the
 * user retyping anything.
 *
 * The code is never in any response; it only arrives by email. So there is nothing here that can
 * read it, autofill it, or show it - only six boxes to type it into.
 */
const VerifyEmail = ({ onVerified }) => {
    const {
        signupEmail, signupEmailDelivery, signupCooldownSeconds,
        verifySignupOtp, resendSignupOtp, changeSignupEmail, resetSignup,
        isVerifyingSignupOtp, isResendingSignupOtp, isChangingSignupEmail
    } = useAuthStore();

    const [digits, setDigits] = useState(Array(6).fill(""));
    const [cooldown, setCooldown] = useState(signupCooldownSeconds || 45);
    const [editingEmail, setEditingEmail] = useState(false);
    const [newEmail, setNewEmail] = useState(signupEmail || "");
    const boxes = useRef([]);

    const code = digits.join("");
    const isComplete = code.length === 6;

    // One interval for the whole cooldown, cleared on unmount. Restarted by setCooldown from the
    // resend and change-email handlers, which is why the effect depends on nothing: it simply
    // counts whatever is there down to zero.
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => setCooldown(seconds => (seconds <= 1 ? 0 : seconds - 1)), 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    useEffect(() => { boxes.current[0]?.focus() }, []);

    const focusBox = (index) => boxes.current[Math.max(0, Math.min(5, index))]?.focus();

    const writeDigits = (startIndex, value) => {
        const incoming = value.replace(/\D/g, "");
        if (!incoming) return;
        setDigits(prev => {
            const next = [...prev];
            for (let i = 0; i < incoming.length && startIndex + i < 6; i++) {
                next[startIndex + i] = incoming[i];
            }
            return next;
        });
        focusBox(startIndex + incoming.length);
    };

    const handleKeyDown = (index, e) => {
        if (e.key === "Backspace") {
            e.preventDefault();
            setDigits(prev => {
                const next = [...prev];
                // clear this box, or step back into the previous one if this one is already empty
                if (next[index]) next[index] = "";
                else if (index > 0) next[index - 1] = "";
                return next;
            });
            if (!digits[index] && index > 0) focusBox(index - 1);
            return;
        }
        if (e.key === "ArrowLeft") { e.preventDefault(); focusBox(index - 1) }
        if (e.key === "ArrowRight") { e.preventDefault(); focusBox(index + 1) }
    };

    const clearCode = () => { setDigits(Array(6).fill("")); focusBox(0) };

    const handleVerify = async (e) => {
        e?.preventDefault();
        if (!isComplete) return toast.error("Please enter all six digits of the code");
        const ok = await verifySignupOtp(code);
        if (ok) onVerified?.();
        // a wrong or expired code leaves the boxes empty rather than making the user delete six
        // characters before trying again
        else clearCode();
    };

    const handleResend = async () => {
        if (cooldown > 0) return;
        const ok = await resendSignupOtp();
        if (ok) { clearCode(); setCooldown(signupCooldownSeconds || 45) }
    };

    const handleChangeEmail = async (e) => {
        e?.preventDefault();
        const trimmed = newEmail.trim();
        if (!trimmed) return toast.error("Please enter your email address");
        if (trimmed.toLowerCase() === (signupEmail || "").toLowerCase()) {
            setEditingEmail(false);
            return;
        }
        const ok = await changeSignupEmail(trimmed);
        if (ok) { setEditingEmail(false); clearCode(); setCooldown(signupCooldownSeconds || 45) }
    };

    const boxClass = "size-12 sm:size-14 text-center text-2xl font-bold rounded-xl border bg-gray-50/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-sm transition-all";

    return (
        <div className="w-full max-w-lg bg-white/95 dark:bg-gray-950/90 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-10 sm:px-12 sm:py-12">

                <div className="flex flex-col items-center text-center mb-8">
                    <div className="flex items-center justify-center size-16 rounded-2xl bg-violet-100 dark:bg-violet-500/10 mb-5">
                        <MailCheck className="size-8 text-violet-600 dark:text-violet-400" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Verify Your Email
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-3">
                        We have sent a verification code to{" "}
                        <span className="font-semibold text-gray-900 dark:text-gray-100 break-all">{signupEmail}</span>.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        The code is six digits and expires in five minutes.
                    </p>
                </div>

                {signupEmailDelivery === 'disabled' && (
                    <div className="flex items-start gap-2.5 mb-6 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30">
                        <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <p className="text-xs text-amber-800 dark:text-amber-300">
                            Email delivery is not configured on the server yet, so the code could not be sent.
                            Please contact the administrator.
                        </p>
                    </div>
                )}
                {signupEmailDelivery === 'failed' && (
                    <div className="flex items-start gap-2.5 mb-6 p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30">
                        <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                        <p className="text-xs text-red-800 dark:text-red-300">
                            The verification email could not be delivered. Check the address, or try Resend OTP.
                        </p>
                    </div>
                )}

                {editingEmail ? (
                    <form onSubmit={handleChangeEmail} className="flex flex-col gap-4">
                        <div className="flex flex-col">
                            <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                New Email Address
                            </label>
                            <div className="relative w-full">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                <input
                                    className="w-full p-3.5 pl-11 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-gray-900 dark:text-gray-100 shadow-sm"
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    placeholder="Enter the correct email address"
                                    autoFocus
                                    required
                                />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-1">
                                Your signup details are saved. Only the email address changes, and a new code is sent.
                            </span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                type="submit"
                                disabled={isChangingSignupEmail}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-700 shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {isChangingSignupEmail
                                    ? <><Loader2 className="size-4 animate-spin" /> Sending</>
                                    : <><Check className="size-4" /> Save and Send Code</>}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setEditingEmail(false); setNewEmail(signupEmail || "") }}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 transition-all cursor-pointer"
                            >
                                <X className="size-4" /> Cancel
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleVerify} className="flex flex-col gap-6">
                        <div className="flex items-center justify-center gap-2 sm:gap-3">
                            {digits.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => { boxes.current[index] = el }}
                                    className={boxClass}
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    // 6 rather than 1, so a pasted or autofilled code lands in one
                                    // box and is spread across the rest instead of being truncated
                                    maxLength={6}
                                    value={digit}
                                    onChange={(e) => writeDigits(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    onFocus={(e) => e.target.select()}
                                    aria-label={`Digit ${index + 1} of the verification code`}
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={!isComplete || isVerifyingSignupOtp}
                            className={`inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all duration-300 ${isComplete && !isVerifyingSignupOtp
                                ? 'bg-violet-600 hover:bg-violet-700 hover:shadow-violet-600/30 cursor-pointer'
                                : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-70'}`}
                        >
                            {isVerifyingSignupOtp
                                ? <><Loader2 className="size-4 animate-spin" /> Verifying</>
                                : <><ShieldCheck className="size-4" /> Verify OTP</>}
                        </button>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={cooldown > 0 || isResendingSignupOtp}
                                className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold border transition-all ${cooldown > 0 || isResendingSignupOtp
                                    ? 'border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                    : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer'}`}
                            >
                                {isResendingSignupOtp
                                    ? <><Loader2 className="size-4 animate-spin" /> Sending</>
                                    : <><RefreshCw className="size-4" /> {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}</>}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setNewEmail(signupEmail || ""); setEditingEmail(true) }}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition-all cursor-pointer"
                            >
                                <Mail className="size-4" /> Change Email Address
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={resetSignup}
                            className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors cursor-pointer"
                        >
                            <ArrowLeft className="size-3.5" /> Back to the signup form
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
