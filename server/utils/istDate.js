// The blood-needed date a recipient picks is a calendar date in India, so every comparison
// against it has to be made in IST. The server may run in any timezone (and Render runs in
// UTC), so the offset is applied explicitly rather than relying on the host clock.
const IST_OFFSET_MINUTES = 5 * 60 + 30
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000

// Splits an instant into the calendar date it falls on in IST.
const istParts = (value)=>{
    const instant = value instanceof Date ? value : new Date(value)
    if(Number.isNaN(instant.getTime())) return null
    const shifted = new Date(instant.getTime() + IST_OFFSET_MS)
    return {
        year:shifted.getUTCFullYear(),
        month:shifted.getUTCMonth(),
        day:shifted.getUTCDate()
    }
}

// A plain "YYYY-MM-DD" string is already a calendar date and carries no timezone, so it is
// read literally. Anything else is an instant and gets converted to its IST calendar date.
const calendarParts = (value)=>{
    if(typeof value === 'string'){
        const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
        if(match){
            return {year:Number(match[1]), month:Number(match[2]) - 1, day:Number(match[3])}
        }
    }
    return istParts(value)
}

// "YYYY-MM-DD" for the IST calendar date the given instant falls on.
export const istDateOnly = (value = Date.now())=>{
    const parts = calendarParts(value)
    if(!parts) return ""
    const month = String(parts.month + 1).padStart(2,'0')
    const day = String(parts.day).padStart(2,'0')
    return `${parts.year}-${month}-${day}`
}

export const todayIST = ()=> istDateOnly(Date.now())

/**
 * The last instant of the given calendar day in IST, as a UTC Date. A request for the 5th
 * stays valid all the way to 23:59:59.999 IST on the 5th, which is 18:29:59.999 UTC.
 */
export const endOfDayIST = (value)=>{
    const parts = calendarParts(value)
    if(!parts) return null
    const endOfDayUTC = Date.UTC(parts.year, parts.month, parts.day, 23, 59, 59, 999)
    return new Date(endOfDayUTC - IST_OFFSET_MS)
}

// True when the given calendar day has already finished in IST.
export const isPastInIST = (value)=>{
    const deadline = endOfDayIST(value)
    return Boolean(deadline) && deadline.getTime() <= Date.now()
}

// A date the recipient may still choose: today or later, judged in IST.
export const isTodayOrFutureIST = (value)=> !isPastInIST(value)
