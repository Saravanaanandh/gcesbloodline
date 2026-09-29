import { useEffect } from "react"
import { Link, useNavigate } from "react-router"
import Navbar from "../components/Navbar.jsx"
import { useRecipientStore } from "../store/useRecipientStore.jsx"
import {
    AlertCircle,
    ArrowLeft,
    CalendarClock,
    CheckCircle2,
    Clock,
    Droplets,
    FileText,
    Heart,
    History,
    Hospital,
    Info,
    Loader2,
    Lock,
    MapPin,
    Phone,
    TriangleAlert,
    User,
} from "lucide-react"
import { formatBloodNeededDate } from "../lib/bloodNeededDate.js"
import StatusBadge from "../components/StatusBadge.jsx"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "../components/ui/alert-dialog.jsx"

// The note the user asked for, kept in one place so the page and any future reuse agree.
const UPDATE_NOTE = "To update your blood request, please fill out and submit the Blood Request Form again."

const STATUS_STYLES = {
    active:{
        label:"Active",
        icon:CheckCircle2,
        className:"bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    },
    fulfilled:{
        label:"Fulfilled",
        icon:Heart,
        className:"bg-green-50 text-green-700 border-green-300 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
    },
    expired:{
        label:"Expired",
        icon:TriangleAlert,
        className:"bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    },
}

const REQUEST_STAGE_LABELS = {
    prepending:"Awaiting the donor's response",
    accepted:"Donor accepted, waiting for you to confirm",
    pending:"You confirmed, waiting for the donor",
    confirmed:"Donation in progress",
}

const Row = ({ icon:Icon, label, value }) => (
    <div className="flex items-start gap-3 py-2.5">
        {Icon && <Icon className="size-4 shrink-0 mt-0.5 text-neutral-400 dark:text-neutral-500" />}
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
            <span className="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500 sm:w-44 sm:shrink-0">
                {label}
            </span>
            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 break-words">
                {value === "" || value === null || value === undefined ? "—" : value}
            </span>
        </div>
    </div>
)

const Card = ({ title, icon:Icon, children, className = "" }) => (
    <div className={`rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 ${className}`}>
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
            {Icon && <Icon className="size-4 text-red-500" />}
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">
                {title}
            </h2>
        </div>
        {children}
    </div>
)

const MyBloodRequest = () => {
    const navigate = useNavigate()
    const {
        myBloodRequest, isMyRequestLoading, getMyBloodRequest,
        cancelConfirmedRequest, isCancellingRequest,
    } = useRecipientStore()

    useEffect(() => {
        getMyBloodRequest()
    }, [getMyBloodRequest])

    if (isMyRequestLoading && !myBloodRequest) {
        return (
            <div className="min-h-screen">
                <Navbar />
                <div className="flex items-center justify-center gap-2 py-24 text-neutral-500">
                    <Loader2 className="size-5 animate-spin" /> Loading your blood request...
                </div>
            </div>
        )
    }

    const data = myBloodRequest || {}
    const request = data.bloodRequest
    const status = data.status || "none"
    const history = data.history || []
    const donorRequests = data.donorRequests || []
    const confirmedDonor = data.confirmedDonor
    const statusStyle = STATUS_STYLES[status]
    const confirmedRequestId = confirmedDonor?.request?._id
    // 'confirmed' means both sides agreed and the donation is at the OTP stage. Cancelling is
    // still allowed - the donor may not turn up - but it is worth saying that it is further along.
    const atOtpStage = confirmedDonor?.request?.status === "confirmed"

    const handleCancelDonation = async () => {
        if (!confirmedRequestId) return
        const cancelled = await cancelConfirmedRequest(confirmedRequestId)
        // the store refreshes the auth user but not this page, and the whole point of cancelling
        // from here is that the form unlocks in front of the user
        if (cancelled) await getMyBloodRequest()
    }

    return (
        <div className="min-h-screen">
            <Navbar />
            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* Header */}
                <Link
                    to="/profile"
                    className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-red-600 dark:hover:text-red-400 mb-5 transition-colors"
                >
                    <ArrowLeft className="size-4" /> Back to profile
                </Link>

                <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40">
                            <FileText className="size-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">My Blood Request</h1>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                The recipient form you submitted, exactly as it was saved
                            </p>
                        </div>
                    </div>
                    {statusStyle && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${statusStyle.className}`}>
                            <statusStyle.icon className="size-3.5" />
                            {statusStyle.label}
                        </span>
                    )}
                </div>

                {/* No live request at all */}
                {!request && (
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-8 text-center flex flex-col items-center gap-3">
                        <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800">
                            <Droplets className="size-7 text-neutral-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
                            You have no active blood request
                        </h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md">
                            {history.length > 0
                                ? "Your previous request is no longer active. You can raise a fresh one at any time — your past requests are kept below."
                                : "Submit the Blood Request Form to start contacting donors."}
                        </p>
                        <button
                            onClick={() => navigate("/request")}
                            className="mt-1 inline-flex items-center gap-2 rounded-md bg-red-600 px-5 py-2.5 text-white font-medium text-sm hover:bg-red-500 transition-colors"
                        >
                            <Droplets className="size-4" /> Raise a Blood Request
                        </button>
                    </div>
                )}

                {request && (
                    <div className="flex flex-col gap-5">
                        {/* Deadline banner - the date the whole request hangs on */}
                        <div className={`rounded-xl border p-4 flex flex-wrap items-center gap-3 ${
                            status === "active"
                                ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                                : status === "fulfilled"
                                ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                                : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
                        }`}>
                            <CalendarClock className={`size-5 shrink-0 ${
                                status === "active" ? "text-emerald-600 dark:text-emerald-400"
                                : status === "fulfilled" ? "text-green-600 dark:text-green-400"
                                : "text-amber-600 dark:text-amber-400"
                            }`} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                                    Date of Blood Needed: {formatBloodNeededDate(request.reqDate)}
                                </p>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                                    {status === "active"
                                        ? "This request stays active until 11:59 PM IST on that date, then it expires automatically."
                                        : status === "fulfilled"
                                        ? "A donation was completed for this request, so it is closed for good."
                                        : "That date has passed, so this request has expired and is no longer shown to donors."}
                                </p>
                            </div>
                        </div>

                        {/* A donation in progress freezes the form. The sentence is the server's
                            own - getMyBloodRequest returns the same string createRecipients refuses
                            the edit with - so the page cannot promise something the API denies. */}
                        {data.isLocked && (
                            <div className="rounded-xl border border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4 flex flex-col gap-3">
                                <div className="flex items-start gap-3">
                                    <Lock className="size-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                                    <div className="text-sm min-w-0">
                                        <p className="font-semibold text-blue-800 dark:text-blue-300 flex flex-wrap items-center gap-2">
                                            In Progress
                                            {confirmedDonor?.donor?.username && (
                                                <span className="font-normal text-neutral-600 dark:text-neutral-400">
                                                    with {confirmedDonor.donor.username}
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-neutral-700 dark:text-neutral-300 mt-1">
                                            {data.formLockedMessage}
                                        </p>
                                    </div>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <button
                                            disabled={isCancellingRequest || !confirmedRequestId}
                                            className="self-start inline-flex items-center gap-2 rounded-md border border-red-300 dark:border-red-800 bg-white dark:bg-neutral-900 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isCancellingRequest
                                                ? <Loader2 className="size-4 animate-spin" />
                                                : <TriangleAlert className="size-4" />}
                                            Cancel Request
                                        </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Cancel the ongoing donation?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {confirmedDonor?.donor?.username
                                                    ? `${confirmedDonor.donor.username} will be told the donation was called off. `
                                                    : "The confirmed donor will be told the donation was called off. "}
                                                {atOtpStage
                                                    ? "This donation has already reached the OTP stage, so only cancel it if the donor cannot go ahead. "
                                                    : ""}
                                                Your blood request itself stays active until{" "}
                                                {formatBloodNeededDate(request.reqDate)}, and you will be free to
                                                edit the form and contact another donor. Completed donations are
                                                never removed.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Keep the donation</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleCancelDonation}
                                                className="bg-red-600 hover:bg-red-500"
                                            >
                                                Yes, cancel it
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}

                        {/* Patient details */}
                        <Card title="Patient Details" icon={User}>
                            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                <Row icon={Droplets} label="Blood Group" value={request.bloodType} />
                                <Row label="Patient's Name" value={request.patientsName} />
                                <Row label="Patient's Age" value={request.patientsage} />
                                <Row label="Gender" value={request.gender} />
                                <Row
                                    label="Emergency"
                                    value={request.isCritical ? "Yes — urgent" : "No"}
                                />
                            </div>
                        </Card>

                        {/* Attendee & contact */}
                        <Card title="Attendee & Contact" icon={Phone}>
                            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                <Row label="Attendee's Name" value={request.AttendeesName} />
                                <Row icon={Phone} label="Attendee's Phone" value={request.AttendeesPhno} />
                                <Row label="Email" value={request.email} />
                            </div>
                        </Card>

                        {/* Location */}
                        <Card title="Location" icon={MapPin}>
                            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                <Row label="District" value={request.location} />
                                <Row label="Place" value={request.place} />
                                <Row label="Pincode" value={request.pinCode} />
                                <Row icon={Hospital} label="Hospital" value={request.hospitalInfo} />
                            </div>
                        </Card>

                        {/* Request details */}
                        <Card title="Request Details" icon={Droplets}>
                            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                <Row
                                    icon={CalendarClock}
                                    label="Date of Blood Needed"
                                    value={formatBloodNeededDate(request.reqDate)}
                                />
                                <Row label="Blood Units" value={`${request.bloodUnits} unit(s)`} />
                                <Row
                                    label="Current Status"
                                    value={statusStyle ? statusStyle.label : status}
                                />
                                <Row
                                    label="Donor Confirmed"
                                    value={request.isDonorFinded ? "Yes" : "Not yet"}
                                />
                                <Row label="Additional Note" value={request.note} />
                            </div>
                        </Card>

                        {/* Donor requests raised against this blood request */}
                        {donorRequests.length > 0 && (
                            <Card title={`Donor Requests (${donorRequests.length})`} icon={Clock}>
                                {/* Several donors may accept; only one can be confirmed. Said here
                                    because this is the list the recipient chooses from. */}
                                {!data.isLocked && data.acceptedCount > 0 && (
                                    <p className="mb-3 flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                                        <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" />
                                        {data.acceptedCount === 1
                                            ? "1 donor has accepted. Confirm them to begin the donation - the others are then told the requirement is taken."
                                            : `${data.acceptedCount} donors have accepted. Confirm one of them to begin the donation - the rest are then told the requirement is taken.`}
                                    </p>
                                )}
                                <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {donorRequests.map(({ request:donorRequest, donor, donorRecordId }) => (
                                        <li key={donorRequest._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                                                    {donor?.username || "Donor"}
                                                </p>
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                    {REQUEST_STAGE_LABELS[donorRequest.status] || donorRequest.status}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={donorRequest.status} size="sm" />
                                                {/* /alldonors/:id is keyed on the Donor record id, which the
                                                    server now sends alongside the profile */}
                                                {donorRecordId && (
                                                    <Link
                                                        to={`/alldonors/${donorRecordId}`}
                                                        className="text-xs font-medium text-red-600 hover:text-red-500 dark:text-red-400"
                                                    >
                                                        View
                                                    </Link>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        )}

                        {/* The update note the user asked for, directly below the details */}
                        <div className="rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800/50 p-4 flex flex-wrap items-center gap-3">
                            <Info className="size-5 shrink-0 text-neutral-500 dark:text-neutral-400" />
                            <p className="flex-1 min-w-0 text-sm text-neutral-700 dark:text-neutral-300">
                                {UPDATE_NOTE}
                            </p>
                            <button
                                onClick={() => navigate("/request")}
                                disabled={data.isLocked || status === "fulfilled"}
                                title={
                                    data.isLocked
                                        ? data.formLockedMessage
                                        : status === "fulfilled"
                                        ? "This request is fulfilled. Use a separate profile for another request."
                                        : "Open the Blood Request Form"
                                }
                                className="rounded-md bg-red-600 px-4 py-2 text-white text-sm font-medium hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Open the Blood Request Form
                            </button>
                        </div>
                    </div>
                )}

                {/* Previous rounds, preserved through expiry */}
                {history.length > 0 && (
                    <div className="mt-8">
                        <Card title={`Request History (${history.length})`} icon={History}>
                            <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                                {history.map(entry => (
                                    <li key={entry._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                                                {entry.patientsName} · {entry.bloodType} · {entry.bloodUnits} unit(s)
                                            </p>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                Needed by {formatBloodNeededDate(entry.reqDate)}
                                                {entry.place ? ` · ${entry.place}` : ""}
                                            </p>
                                        </div>
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                            entry.reason === "fulfilled"
                                                ? "bg-green-50 text-green-700 border-green-300 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800"
                                                : "bg-neutral-100 text-neutral-600 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-600"
                                        }`}>
                                            {entry.reason}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-3 flex items-start gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                                <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                                Past requests are kept for your records. They do not block you from raising a new one.
                            </p>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}

export default MyBloodRequest
