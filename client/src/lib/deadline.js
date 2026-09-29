// Formats the acceptance deadline the backend puts on a request as respondBy. The deadline
// itself is enforced server side by the expiry sweeper; this is only how it is shown.
export const formatTimeLeft = (respondBy) => {
    if (!respondBy) return ""
    const msLeft = new Date(respondBy).getTime() - Date.now()
    if (Number.isNaN(msLeft)) return ""
    if (msLeft <= 0) return "expired"

    const minutes = Math.floor(msLeft / 60000)
    const days = Math.floor(minutes / (60 * 24))
    if (days >= 1) return `${days} day${days === 1 ? "" : "s"} left`
    const hours = Math.floor(minutes / 60)
    if (hours >= 1) return `${hours}h ${minutes % 60}m left`
    return `${Math.max(1, minutes)}m left`
}

export const isDeadlinePassed = (respondBy) =>
    Boolean(respondBy) && new Date(respondBy).getTime() <= Date.now()
