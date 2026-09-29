// The blood-needed date is a calendar date in India and the server judges it in IST, so the
// form has to agree. `new Date().toISOString().split('T')[0]` gives the UTC date, which is
// the previous day for the whole of 05:30 IST backwards - a request for today would then be
// offered by the date picker and rejected by the server. The offset is applied explicitly
// rather than trusting the browser's own timezone, which the user can have set to anything.
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000

// "YYYY-MM-DD" for the IST calendar date the given instant falls on.
export const istDateOnly = (value = Date.now())=>{
    const instant = value instanceof Date ? value : new Date(value)
    if(Number.isNaN(instant.getTime())) return ""
    return new Date(instant.getTime() + IST_OFFSET_MS).toISOString().split('T')[0]
}

// The earliest date the recipient may pick, and the `min` on the date input.
export const todayIST = ()=> istDateOnly(Date.now())

/**
 * The stored value is a Date, so it is rendered through its IST calendar date - otherwise a
 * browser west of UTC would show the previous day and disagree with the deadline the server
 * is enforcing.
 */
export const formatBloodNeededDate = (value)=>{
    const dateOnly = istDateOnly(value)
    if(!dateOnly) return "-"
    const [year, month, day] = dateOnly.split('-')
    return `${day}-${month}-${year}`
}

export const BLOOD_NEEDED_LABEL = "Date of Blood Needed:"
export const BLOOD_NEEDED_HINT = "The request stays open until the end of this day, then expires automatically."

/**
 * Validates the picked date the same way the server does. Returns an error message, or "" when
 * the date is acceptable. A plain string comparison is enough because both sides are
 * "YYYY-MM-DD" in the same calendar.
 */
export const validateBloodNeededDate = (value)=>{
    if(!value) return "Please choose the date the blood is needed"
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Please choose a valid date for when the blood is needed"
    if(value < todayIST()) return "The date the blood is needed must be today or later"
    return ""
}
