// Tunable deadlines for the donation workflow. Every value can be overridden with an
// environment variable so the timings can be changed without touching code.
//
// These are read on each call rather than captured at import time: server.js runs
// dotenv.config() in its body, which happens after every import has been evaluated, so a
// module-level constant here would always miss the values from .env.
const readNumber = (name, fallback)=>{
    const parsed = Number(process.env[name])
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

// How long a donor has, after accepting, to see the donation through to "confirmed".
// The clock restarts when the recipient confirms them, so each side gets a full window.
export const getAcceptanceTimeoutMinutes = ()=> readNumber('ACCEPTANCE_TIMEOUT_MINUTES', 720)

// How long a blood request stays open before the sweeper expires it. This replaces the
// old 30 day MongoDB TTL, which deleted documents with no regard for what was in flight.
export const getRequestExpiryDays = ()=> readNumber('REQUEST_EXPIRY_DAYS', 30)

// How long an individual donor request stays open if nobody ever acts on it.
export const getDonorRequestExpiryDays = ()=> readNumber('DONOR_REQUEST_EXPIRY_DAYS', 30)

// How often the expiry sweeper runs.
export const getExpirySweepMinutes = ()=> readNumber('EXPIRY_SWEEP_MINUTES', 5)

// One active request per profile, settled by one confirmed donor, so the quantity a single
// request may ask for is bounded. These are plain constants rather than env lookups: they are
// a rule about what one donor can be asked for, not a timing knob.
export const RECOMMENDED_BLOOD_UNITS = 2
export const MAX_BLOOD_UNITS = 3

export const minutesFromNow = (minutes)=> new Date(Date.now() + minutes * 60 * 1000)
export const daysFromNow = (days)=> new Date(Date.now() + days * 24 * 60 * 60 * 1000)

export const acceptanceDeadline = ()=> minutesFromNow(getAcceptanceTimeoutMinutes())
export const requestExpiry = ()=> daysFromNow(getRequestExpiryDays())
export const donorRequestExpiry = ()=> daysFromNow(getDonorRequestExpiryDays())
