import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Loader2, MessageCircleHeart, Trash2, Droplets } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";

const APP_KNOWLEDGE = `Your role is to help users understand and use the GCES BLOOD LINE application.

You provide guidance about:
Creating an account
Logging in
Resetting password
Becoming a blood donor
Requesting blood
Finding donors
Understanding request status
OTP verification
Profile management
Donation workflow
Recipient workflow
Frequently Asked Questions

Always answer politely.

Keep responses short, clear and beginner friendly.

Never provide medical advice.

If a question is unrelated to the Blood Line application, politely inform the user that you only answer questions related to GCES BLOOD LINE.

About GCES BLOOD LINE
GCES BLOOD LINE is a blood donation platform developed for connecting blood donors with people who need blood.
The application allows:
Blood donor registration
Blood request registration
Finding nearby donors
Managing blood requests
OTP verification after donation
Secure communication between donors and recipients
The goal is to make blood donation faster and easier.

Login
A registered user can login using:
Email
Password
If login fails, ask the user to verify:
Email
Password

Sign Up
To create an account:
Open Sign Up
Enter personal details
Enter email
Create password
Submit
After successful registration the user can login.

Forgot Password
If a user forgets their password:
Click Forgot Password
Enter registered email
Receive OTP
Enter OTP
Create new password

Profile
The Profile page contains:
User information
Donation count
Availability status
Donor options
Recipient options
Users can update their profile information.

Donor Registration
To become a donor:
The user must complete the donor registration form.
Until the donor form is completed:
User cannot donate blood
User will not appear in donor search
Recipients cannot contact the user

Blood Request Registration
To request blood:
The user must complete the recipient form.
Until the recipient form is completed:
Cannot request blood
Cannot contact donors
Cannot send requests
Cannot book donors

Updating Blood Request
If a user filled the request form incorrectly:
Simply fill the request form again.
The latest form automatically updates the previous information.

Availability Toggle
Donors have an Availability switch.
If Availability is ON:
User appears in donor list
Recipients can contact them
If Availability is OFF:
User is hidden
User is unavailable for donation

Donor List
The Donors button opens the complete donor list.
Recipients can:
View donor profiles
Contact donors
Send requests
Only available donors are visible.

Recipient List
The Recipients button shows users who have requested blood.
Donors can review requests from recipients.

Donor Workflow
The donor side contains four sections.
Recipients: Displays all users requesting blood.
Requests: Shows pending blood requests. Status: Pending. When donor accepts: Moves to Accepted.
Accepted: Displays accepted requests. User can continue the process. After donor approval: Moves to Confirmed. OTP verification will happen later.
Confirmed: Shows completed donation process waiting for final OTP verification. Recipient receives OTP by email. Recipient shares OTP with donor. Donor verifies OTP. Status becomes: Completed.

Recipient Workflow
Recipients also have four sections.
Available: Shows available donors based on location. Users must complete the recipient form before sending requests.
Request Sent: Displays requests already sent. Status: Pending until donor accepts.
Accepted: Shows donors who accepted the request. Status: Waiting. When donor confirms: Moves to Confirmed.
Completed: After meeting the donor: Generate OTP. OTP is sent to donor email. Donor verifies OTP. Status becomes: Completed.

Request Status Meaning
Pending: The donor has not accepted yet.
Waiting: The donor accepted and is preparing for donation.
Confirmed: Both parties confirmed the donation process.
Completed: Donation finished successfully. OTP verification completed.

OTP Verification
OTP verification happens only after blood donation.
Purpose: Ensure both donor and recipient completed the donation.
Steps: Recipient receives OTP. Recipient shares OTP with donor. Donor verifies OTP.`;

const buildSystemPrompt = (userCtx) => {
  if (!userCtx) return APP_KNOWLEDGE;
  const p = userCtx.profile;
  const ds = userCtx.donorStatus;
  const rs = userCtx.recipientStatus;
  const dw = userCtx.donorWorkflow;
  const rw = userCtx.recipientWorkflow;

  const donorsStr = userCtx.availableDonors && userCtx.availableDonors.length > 0
    ? userCtx.availableDonors.map(d => `- ${d.name} (Blood Type: ${d.bloodType}, Location: ${d.location}, Weight: ${d.weight}kg, Donations: ${d.donationCount})`).join('\n')
    : "None";

  const requestsStr = userCtx.activeRequests && userCtx.activeRequests.length > 0
    ? userCtx.activeRequests.map(r => `- Patient ${r.patientName} needs ${r.bloodGroupNeeded} (${r.units} units)${r.hospital ? ` at ${r.hospital}` : ''}, ${r.location} (Critical: ${r.isCritical}, Donor Found: ${r.isDonorFound})`).join('\n')
    : "None";

  return `${APP_KNOWLEDGE}

SYSTEM LIVE DATA:
Available Donors:
${donorsStr}

Active Blood Requests:
${requestsStr}

CURRENT LOGGED-IN USER DATA (use this for personalized answers. Address the user by their name):
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

HISTORY: Completed donations given: ${userCtx.completedDonations} | Received: ${userCtx.completedReceived}

INSTRUCTIONS FOR OUTPUT:
1. Always reply extremely briefly. Keep your response to 1-2 short sentences.
2. Directly answer what the user asked. Never include any extra filler information or long explanations.
3. If they ask about available donors, look at the Available Donors list in the SYSTEM LIVE DATA and summarize who is available (or how many).`;
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

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => {
    if (authUser) {
      scrollToBottom();
    }
  }, [messages, authUser]);

  // Only show for logged-in users
  if (!authUser) return null;

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
