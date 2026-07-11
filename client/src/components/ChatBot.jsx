import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Loader2, MessageCircleHeart, Trash2, Droplets } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";

const APP_KNOWLEDGE = `You are GCES BLOOD LINE AI Assistant — a personal assistant for the GCES BLOOD LINE blood donation platform.

PLATFORM OVERVIEW: GCES BLOOD LINE connects blood donors with recipients. Features: donor registration, blood request registration, finding donors, managing requests, OTP verification after donation.

LOGIN/SIGNUP: Login with email+password. Sign up with personal details. Forgot password uses OTP sent to email.

DONOR REGISTRATION: Complete donor form to appear in donor list. Without form: cannot donate, won't appear in search. Availability switch must be ON to be visible.

RECIPIENT REGISTRATION: Complete recipient form to request blood. Without form: cannot contact donors or send requests.

DONOR WORKFLOW (4 sections):
1. Recipients — view all blood requesters
2. Requests (Pending) — incoming requests → accept to move to Accepted
3. Accepted — accepted requests → confirm to move to Confirmed
4. Confirmed — waiting for OTP verification → recipient gets OTP by email → shares with donor → donor verifies → status = Completed

RECIPIENT WORKFLOW (4 sections):
1. Available — find donors by location (recipient form required)
2. Request Sent (Pending) — sent requests awaiting donor acceptance
3. Accepted (Waiting) — donor accepted → waiting for donor confirmation
4. Completed — generate OTP → donor verifies → Completed

STATUS MEANINGS: prepending/Pending = donor not accepted yet | Waiting = donor accepted | Confirmed = both confirmed | Completed = OTP verified done

OTP: Only after donation. Recipient generates OTP → shares with donor → donor verifies → marks Completed.

RULES: Never give medical advice. Only answer about GCES BLOOD LINE. Keep answers short (2-5 sentences). Never expose raw IDs or internal fields.`;

const buildSystemPrompt = (userCtx) => {
  if (!userCtx) return APP_KNOWLEDGE;
  const p = userCtx.profile;
  const ds = userCtx.donorStatus;
  const rs = userCtx.recipientStatus;
  const dw = userCtx.donorWorkflow;
  const rw = userCtx.recipientWorkflow;

  return `${APP_KNOWLEDGE}

CURRENT USER DATA (use this for personalized answers. Address the user by their name):
Name: ${p.name} | Age: ${p.age} | Gender: ${p.gender} | Blood Group: ${p.bloodGroup}
Location: ${p.location} | Donation Count: ${p.donationCount} | Weight: ${p.weight}kg
Availability: ${ds.availabilityStatus}

DONOR STATUS:
- Registered as donor: ${ds.isRegisteredAsDonor ? "Yes" : "No"}
- Donor form completed: ${ds.donorFormCompleted ? "Yes" : "No"}
${ds.donorDetails ? `- Donated before: ${ds.donorDetails.hasDonatedBefore} | Last 6-month activity: ${ds.donorDetails.lastSixMonthActivity}` : ""}

RECIPIENT STATUS:
- Registered as recipient: ${rs.isRegisteredAsRecipient ? "Yes" : "No"}
- Recipient form completed: ${rs.recipientFormCompleted ? "Yes" : "No"}
${rs.recipientDetails ? `- Patient blood needed: ${rs.recipientDetails.bloodGroupNeeded} | Units: ${rs.recipientDetails.bloodUnits} | Critical: ${rs.recipientDetails.isCritical} | Donor found: ${rs.recipientDetails.isDonorFound}` : ""}

DONOR WORKFLOW COUNTS:
- Pending incoming requests: ${dw.incomingPendingRequests}
- Accepted requests: ${dw.acceptedRequests}
- Waiting for your confirmation: ${dw.waitingForConfirmation}
- Confirmed (awaiting OTP): ${dw.confirmedAwaitingOTP}

RECIPIENT WORKFLOW COUNTS:
- Sent requests (pending): ${rw.sentPendingRequests}
- Accepted by donor: ${rw.acceptedByDonor}
- Waiting for donor confirm: ${rw.waitingForDonorConfirm}
- Confirmed (generate OTP): ${rw.confirmedAwaitingOTP}

HISTORY: Completed donations given: ${userCtx.completedDonations} | Received: ${userCtx.completedReceived}`;
};

const QUICK_QUESTIONS = [
  "What should I do next?",
  "How do I register as a donor?",
  "What is my current request status?",
  "How does OTP verification work?",
];

const LoadingDots = () => (
  <div className="flex items-center gap-1.5">
    {[0, 1, 2].map(i => (
      <motion.div key={i} className="w-2 h-2 rounded-full bg-red-400"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
      />
    ))}
  </div>
);

export default function ChatBot() {
  const { authUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [userContext, setUserContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasNotification, setHasNotification] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Only show for logged-in users
  if (!authUser) return null;

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const loadContextAndOpen = async () => {
    if (isOpen) { setIsOpen(false); return; }
    setIsOpen(true);
    setHasNotification(false);
    if (userContext) return; // already loaded

    setIsLoadingContext(true);
    try {
      const res = await axiosInstance.get("/ai/user-context");
      setUserContext(res.data.context);
      const name = res.data.context?.profile?.name || authUser.username;
      setMessages([{
        role: "assistant",
        content: `👋 Hello **${name}**! I'm your GCES BLOOD LINE AI Assistant. I've loaded your latest data and I'm ready to give you personalized guidance. How can I help you today?`,
      }]);
    } catch {
      setUserContext(null);
      setMessages([{
        role: "assistant",
        content: `👋 Hello **${authUser.username}**! I'm your GCES BLOOD LINE AI Assistant. How can I help you today?`,
      }]);
    } finally {
      setIsLoadingContext(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  };

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || isStreaming) return;
    setInput("");

    const history = [...messages, { role: "user", content: userMsg }];
    setMessages(history);
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      // Get base URL from axiosInstance
      const baseURL = import.meta.env.MODE === "development"
        ? "http://localhost:5000/api/v1"
        : "/api/v1";

      const response = await fetch(`${baseURL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          systemPrompt: buildSystemPrompt(userContext),
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error(`${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              setMessages(prev => {
                const upd = [...prev];
                upd[upd.length - 1] = {
                  role: "assistant",
                  content: upd[upd.length - 1].content + parsed.content,
                };
                return upd;
              });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => {
        const upd = [...prev];
        upd[upd.length - 1] = {
          role: "assistant",
          content: "⚠️ I'm having trouble connecting right now. Please try again in a moment.",
        };
        return upd;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const clearChat = () => {
    const name = userContext?.profile?.name || authUser.username;
    setMessages([{
      role: "assistant",
      content: `👋 Hello **${name}**! Chat cleared. How can I help you?`,
    }]);
  };

  const fmt = (txt) =>
    txt
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>");

  return (
    <>
      {/* Floating button */}
      <motion.div className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.8 }}>
        <motion.button onClick={loadContextAndOpen} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          title="GCES Blood Line AI Assistant"
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white shadow-2xl flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isOpen
              ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}><X className="w-6 h-6" /></motion.div>
              : <motion.div key="msg" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}><MessageCircleHeart className="w-6 h-6" /></motion.div>
            }
          </AnimatePresence>
          <AnimatePresence>
            {hasNotification && !isOpen && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
            )}
          </AnimatePresence>
          {!isOpen && <span className="absolute inset-0 rounded-full bg-red-400 opacity-30 animate-ping" />}
        </motion.button>
      </motion.div>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[390px] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-red-100 dark:border-red-900/40"
            style={{ background: "var(--background)", color: "var(--foreground)" }}>

            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">GCES Blood Line AI</p>
                  <p className="text-red-200 text-xs flex items-center gap-1.5">
                    {isLoadingContext
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing your data...</>
                      : <><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" /> Personalized · Ready</>}
                  </p>
                </div>
              </div>
              <button onClick={clearChat} title="Clear chat"
                className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Loading screen */}
            {isLoadingContext ? (
              <div className="flex flex-col items-center justify-center gap-5 py-14 px-6"
                style={{ background: "var(--background)" }}>
                <motion.div animate={{ y: [0, -10, 0], scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-red-400 to-red-700 flex items-center justify-center shadow-lg shadow-red-300/40">
                  <Droplets className="w-8 h-8 text-white" />
                </motion.div>
                <div className="text-center space-y-2">
                  <p className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Loading your profile...</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Fetching live data for personalized guidance</p>
                </div>
                <LoadingDots />
                <div className="w-full max-w-[200px] h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full"
                    initial={{ width: "0%" }} animate={{ width: "100%" }}
                    transition={{ duration: 2, ease: "easeInOut" }} />
                </div>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[380px]"
                  style={{ background: "var(--background)" }}>
                  {messages.map((msg, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22 }}
                      className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white shadow ${msg.role === "user" ? "bg-red-500" : "bg-gradient-to-br from-red-600 to-red-800"}`}>
                        {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </div>
                      <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.role === "user"
                          ? "bg-red-600 text-white rounded-tr-sm"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-sm"
                      }`}>
                        {msg.content === "" && isStreaming
                          ? <span className="flex items-center gap-2 text-gray-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="text-xs">Thinking...</span></span>
                          : <span dangerouslySetInnerHTML={{ __html: fmt(msg.content) }} />
                        }
                      </div>
                    </motion.div>
                  ))}

                  {messages.length === 1 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 px-1 uppercase tracking-wide">Quick questions</p>
                      {QUICK_QUESTIONS.map(q => (
                        <button key={q} onClick={() => sendMessage(q)}
                          className="block w-full text-left text-xs px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0"
                  style={{ background: "var(--background)" }}>
                  <div className="flex items-end gap-2">
                    <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="Ask me anything about your account..."
                      rows={1} disabled={isStreaming}
                      className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 max-h-28"
                      style={{ scrollbarWidth: "none" }} />
                    <motion.button onClick={() => sendMessage()} disabled={!input.trim() || isStreaming}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="w-10 h-10 flex-shrink-0 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white flex items-center justify-center transition-colors disabled:cursor-not-allowed shadow">
                      {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </motion.button>
                  </div>
                  <p className="text-[10px] text-center text-gray-400 dark:text-gray-600 mt-1.5">
                    GCES Blood Line AI · Personalized Assistant
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
