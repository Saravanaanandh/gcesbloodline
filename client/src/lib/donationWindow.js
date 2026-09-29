// The 90 day gap is the usual guideline for whole blood donation, but it is only an
// estimate - a blood bank decides actual eligibility. Nothing in the app blocks a donor
// purely on this date; it is shown as guidance.
export const DONATION_GAP_DAYS = 90

export const formatDonationDate = (value) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
}

// The friendly suggestion shown right after a donation and again on the profile.
export const nextDonationSuggestion = (nextDonationDate) =>
    `Thank you for saving a life! Your estimated next donation date is ${formatDonationDate(nextDonationDate)}, ${DONATION_GAP_DAYS} days from your last donation. Please consult a blood bank to confirm your eligibility before donating again.`

const startOfDay = (value) => {
    const date = new Date(value)
    date.setHours(0, 0, 0, 0)
    return date
}

/**
 * Derives the donation window from the logged in user.
 * hasDonated  - there is a completed donation to count from
 * isDue       - the estimated date has arrived or passed
 * daysLeft    - whole days until the estimated date (0 once due)
 * needsOptIn  - donated before and has not turned availability back on yet
 * needsForm   - the donor eligibility form has not been refilled since the last donation
 */
export const getDonationWindow = (user) => {
    const nextDonationDate = user?.nextDonationDate || ""
    const hasDonated = Boolean(user?.lastDonated)
    // the server sends this alongside the profile; treat a missing flag as "current" so an
    // older cached profile cannot lock the donor out of the toggle
    const needsForm = hasDonated && user?.eligibilityFormCurrent === false
    if (!hasDonated || !nextDonationDate) {
        return { hasDonated, nextDonationDate: "", isDue: false, daysLeft: 0, needsOptIn: false, needsForm }
    }

    const today = startOfDay(Date.now())
    const due = startOfDay(nextDonationDate)
    const daysLeft = Math.max(0, Math.ceil((due - today) / (24 * 60 * 60 * 1000)))

    return {
        hasDonated,
        nextDonationDate,
        isDue: daysLeft === 0,
        daysLeft,
        needsOptIn: !user?.available,
        needsForm,
    }
}
