// Mirrors server/config/workflow.js. One profile carries one active request and one confirmed
// donor settles it, so the quantity a single request may ask for is bounded. The server
// enforces this too - these values only keep the form from submitting something it will refuse.
export const RECOMMENDED_BLOOD_UNITS = 2
export const MAX_BLOOD_UNITS = 3

export const UNITS_HINT = `Recommended: 1 or 2 units. Maximum ${MAX_BLOOD_UNITS}. One confirmed donor covers this request, subject to hospital approval.`

// Returns an error message, or "" when the value is acceptable.
export const validateBloodUnits = (value) => {
    const units = Number(value)
    if (!Number.isInteger(units) || units < 1) return "Please enter a whole number of blood units, at least 1"
    if (units > MAX_BLOOD_UNITS) {
        return `A single request can ask for at most ${MAX_BLOOD_UNITS} units. Use a separate profile if more blood is needed.`
    }
    return ""
}
