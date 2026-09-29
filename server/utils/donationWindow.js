// The 90 day gap between donations is the common guideline for whole blood, but it is only
// an estimate - actual eligibility is decided by a blood bank. Nothing here blocks a donor
// on the date alone; the estimate is surfaced to the donor and the hard gate is the
// eligibility form plus the donor manually turning availability back on.
export const DONATION_GAP_DAYS = 90

// Dates are stored as plain "YYYY-MM-DD" strings on User.lastDonated / User.nextDonationDate,
// which is what the existing profile UI already reads.
export const toDateOnly = (date)=> new Date(date).toISOString().split('T')[0]

export const getNextDonationDate = (fromDate)=>{
    const date = new Date(fromDate)
    date.setDate(date.getDate() + DONATION_GAP_DAYS)
    return toDateOnly(date)
}
