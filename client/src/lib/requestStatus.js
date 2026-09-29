import {
    BadgeCheck, Ban, CalendarX, CheckCheck, Clock, Eye, Heart, Hourglass, Lock,
    SendHorizontal, ShieldCheck, Smartphone, TriangleAlert, X,
} from "lucide-react"

/**
 * One description of every workflow state, for every screen that shows one.
 *
 * Before this, each page invented its own copy and colours for the same status, and each derived
 * "is this in progress" from a different field - `isLocked`, `hasConfirmedDonor`, `isDonorFinded`,
 * `committedRequestId`, or a status string compared inline. They disagreed, which is how the
 * directory could offer Confirm on a request the server had already closed.
 *
 * The statuses themselves are the server's: prepending -> accepted -> pending -> confirmed ->
 * finalState, with rejected and expired as exits.
 *
 *   prepending  the request has been sent; the donor has not answered
 *   accepted    the donor said yes; the recipient has not chosen them yet
 *   pending     the recipient chose this donor - the commitment starts here
 *   confirmed   both sides agreed; the donation is happening, OTP next
 *   finalState  donated and verified
 */

// The commitment. A donor who has merely accepted is not one: the recipient is still choosing
// between everybody who accepted, which is the whole point of the five-donors-three-accept case.
// This is the same pair of statuses the backend locks on.
export const COMMITTED_STATUSES = ["pending", "confirmed"]
// Anything still moving. `accepted` counts - the donor has committed their intent even though the
// recipient has not chosen them.
export const LIVE_STATUSES = ["prepending", "accepted", "pending", "confirmed"]

export const isCommittedStatus = (status) => COMMITTED_STATUSES.includes(status)
export const isLiveStatus = (status) => LIVE_STATUSES.includes(status)

const TONES = {
    amber:{
        pill:"bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        solid:"bg-amber-500 text-white hover:bg-amber-600",
        icon:"text-amber-600 dark:text-amber-400",
    },
    emerald:{
        pill:"bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        solid:"bg-emerald-600 text-white hover:bg-emerald-700",
        icon:"text-emerald-600 dark:text-emerald-400",
    },
    blue:{
        pill:"bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
        solid:"bg-blue-600 text-white hover:bg-blue-700",
        icon:"text-blue-600 dark:text-blue-400",
    },
    green:{
        pill:"bg-green-50 text-green-700 border-green-300 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
        solid:"bg-green-600 text-white hover:bg-green-700",
        icon:"text-green-600 dark:text-green-400",
    },
    rose:{
        pill:"bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
        solid:"bg-rose-600 text-white hover:bg-rose-700",
        icon:"text-rose-600 dark:text-rose-400",
    },
    neutral:{
        pill:"bg-neutral-100 text-neutral-600 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-600",
        solid:"bg-neutral-500 text-white",
        icon:"text-neutral-500 dark:text-neutral-400",
    },
}

export const toneClasses = (tone) => TONES[tone] || TONES.neutral

/**
 * How a status reads, and to whom.
 *
 * `pending` and `confirmed` are both "In Progress" - the distinction between them (who has still
 * to confirm) belongs in the description, not the badge, because F3 asks for one prominent
 * In Progress label rather than two similar-looking ones.
 */
const STATUS_META = {
    prepending:{
        label:"Pending", tone:"amber", Icon:Clock,
        forRecipient:"Waiting for the donor to respond",
        forDonor:"This recipient is waiting for your answer",
    },
    accepted:{
        label:"Accepted", tone:"emerald", Icon:CheckCheck,
        forRecipient:"The donor accepted. Confirm them to start the donation",
        forDonor:"You accepted. Waiting for the recipient to confirm you",
    },
    pending:{
        label:"In Progress", tone:"blue", Icon:Hourglass,
        forRecipient:"You confirmed this donor. Waiting for them to confirm",
        forDonor:"The recipient confirmed you. Confirm to start the donation",
    },
    confirmed:{
        label:"In Progress", tone:"blue", Icon:ShieldCheck,
        forRecipient:"The donation is under way. Share the OTP with the donor to complete it",
        forDonor:"The donation is under way. Generate the OTP once you have donated",
    },
    finalState:{
        label:"Completed", tone:"green", Icon:BadgeCheck,
        forRecipient:"The donation was completed and verified",
        forDonor:"The donation was completed and verified",
    },
    rejected:{
        label:"Rejected", tone:"rose", Icon:X,
        forRecipient:"This request was rejected",
        forDonor:"You rejected this request",
    },
    cancelled:{
        label:"Cancelled", tone:"neutral", Icon:Ban,
        forRecipient:"This request was cancelled",
        forDonor:"This request was cancelled",
    },
    expired:{
        label:"Expired", tone:"neutral", Icon:CalendarX,
        forRecipient:"This request expired",
        forDonor:"This request expired",
    },
}

const UNKNOWN_META = { label:"No request", tone:"neutral", Icon:Ban, forRecipient:"", forDonor:"" }

/** `as` is 'recipient' | 'donor' - only which description comes back changes. */
export const statusMeta = (status, as = "recipient") => {
    const meta = STATUS_META[status] || UNKNOWN_META
    return {
        status,
        label:meta.label,
        tone:meta.tone,
        Icon:meta.Icon,
        description:as === "donor" ? meta.forDonor : meta.forRecipient,
        classes:toneClasses(meta.tone),
    }
}

/**
 * What a recipient may do about one donor, given everything that can close it off.
 *
 * The backend refuses every case marked `disabled` here, so this decides what the user is told,
 * not what they are allowed to do. Order matters: an existing request outranks the directory
 * rules, and the viewer's own closed or committed requirement outranks the donor's availability.
 */
export const donorAction = ({
    status = null,
    donorIsCommitted = false,
    viewerIsRecipient = true,
    viewerCommitted = false,
    viewerCommittedDonorId = null,
    donorId = null,
    requestClosed = false,
    closedReason = null,
} = {}) => {
    const committedToThisDonor = Boolean(
        viewerCommittedDonorId && donorId && String(viewerCommittedDonorId) === String(donorId)
    )

    if (status) {
        const meta = statusMeta(status, "recipient")
        if (status === "prepending") {
            return { kind:"pending", ...meta, Icon:Clock, actionLabel:"Pending", disabled:true }
        }
        if (status === "accepted") {
            // Somebody else is already confirmed for this requirement, so this acceptance can no
            // longer be taken up - the server cancels it and emails the donor about it.
            if (viewerCommitted && !committedToThisDonor) {
                return {
                    ...statusMeta("cancelled", "recipient"),
                    kind:"closed", actionLabel:"Closed", Icon:Lock, disabled:true,
                    description:"You have already confirmed another donor for this request",
                }
            }
            return { kind:"confirm", ...meta, actionLabel:"Confirm", disabled:false }
        }
        if (status === "pending" || status === "confirmed") {
            return {
                kind:"inprogress", ...meta,
                actionLabel:status === "confirmed" ? "Verify OTP" : "In Progress",
                Icon:status === "confirmed" ? Smartphone : Hourglass,
                disabled:false,
            }
        }
        if (status === "finalState") {
            return { kind:"completed", ...meta, actionLabel:"Completed", disabled:true }
        }
        return { kind:"closed", ...meta, actionLabel:meta.label, disabled:true }
    }

    // No request between these two. Everything below is about whether one may be created.
    if (!viewerIsRecipient) {
        return {
            kind:"view", label:"View", actionLabel:"View", tone:"neutral", Icon:Eye,
            classes:toneClasses("neutral"), disabled:false,
            description:"Fill the blood request form to contact this donor",
        }
    }
    if (requestClosed) {
        const fulfilled = closedReason === "fulfilled"
        return {
            kind:"closed",
            label:fulfilled ? "Fulfilled" : "Expired",
            actionLabel:fulfilled ? "Fulfilled" : "Expired",
            tone:fulfilled ? "green" : "neutral",
            Icon:fulfilled ? Heart : CalendarX,
            classes:toneClasses(fulfilled ? "green" : "neutral"),
            disabled:true,
            description:fulfilled
                ? "A donation was completed for your request, so it is closed"
                : "The date you needed the blood has passed. Raise a new request to contact donors",
        }
    }
    // F3: while this recipient is committed to one donor they may not approach anybody else. The
    // API refuses it too; this is so the button can say why instead of throwing a 409 at them.
    if (viewerCommitted) {
        return {
            kind:"locked", label:"In Progress", actionLabel:"Locked", tone:"blue", Icon:Lock,
            classes:toneClasses("blue"), disabled:true,
            description:"Your donation is already in progress with a confirmed donor. Cancel it to contact another donor",
        }
    }
    if (donorIsCommitted) {
        return {
            kind:"unavailable", label:"Unavailable", actionLabel:"Unavailable", tone:"neutral",
            Icon:TriangleAlert, classes:toneClasses("neutral"), disabled:true,
            description:"This donor is committed to another recipient right now",
        }
    }
    return {
        kind:"send", label:"Available", actionLabel:"Send Request", tone:"emerald",
        Icon:SendHorizontal, classes:toneClasses("emerald"), disabled:false,
        description:"This donor is available. Send them a request",
    }
}

/**
 * The mirror image: what a donor may do about one recipient's requirement.
 *
 * `donorCommitted` is this donor's own lock. A donor already committed to one requirement cannot
 * accept another - the backend's atomic claim on Donor.committedRequestId is what actually stops
 * it, and this explains the refusal before they click.
 */
export const recipientAction = ({
    status = null,
    viewerIsDonor = true,
    donorCommitted = false,
    committedToThisRecipient = false,
    requestClosed = false,
} = {}) => {
    if (status) {
        const meta = statusMeta(status, "donor")
        if (status === "prepending") {
            return { kind:"respond", ...meta, actionLabel:"Accept", Icon:CheckCheck, disabled:false }
        }
        if (status === "accepted") {
            return { kind:"waiting", ...meta, actionLabel:"Waiting", Icon:Clock, disabled:true }
        }
        if (status === "pending") {
            return { kind:"confirm", ...meta, actionLabel:"Confirm", Icon:CheckCheck, disabled:false }
        }
        if (status === "confirmed") {
            return { kind:"otp", ...meta, actionLabel:"Generate OTP", Icon:Smartphone, disabled:false }
        }
        if (status === "finalState") {
            return { kind:"completed", ...meta, actionLabel:"Completed", disabled:true }
        }
        return { kind:"closed", ...meta, actionLabel:meta.label, disabled:true }
    }

    if (!viewerIsDonor) {
        return {
            kind:"view", label:"View", actionLabel:"View", tone:"neutral", Icon:Eye,
            classes:toneClasses("neutral"), disabled:false,
            description:"Fill the donor form to accept blood requests",
        }
    }
    if (requestClosed) {
        return {
            kind:"closed", label:"Closed", actionLabel:"Closed", tone:"neutral", Icon:CalendarX,
            classes:toneClasses("neutral"), disabled:true,
            description:"This requirement is no longer active",
        }
    }
    if (donorCommitted && !committedToThisRecipient) {
        return {
            kind:"locked", label:"In Progress", actionLabel:"Locked", tone:"blue", Icon:Lock,
            classes:toneClasses("blue"), disabled:true,
            description:"You are already committed to another donation. Finish or cancel it first",
        }
    }
    return {
        kind:"open", label:"Open", actionLabel:"View", tone:"emerald", Icon:Eye,
        classes:toneClasses("emerald"), disabled:false,
        description:"This recipient needs blood",
    }
}
