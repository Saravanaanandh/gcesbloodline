import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import {
    ArrowLeft, Award, Building2, CalendarClock, CheckCheck, CircleAlert, Droplets, FileText,
    HeartPulse, Loader2, Lock, Mail, MapPin, Phone, Siren, Smartphone, TriangleAlert, User, Users, X,
} from "lucide-react"
import Navbar from "../components/Navbar.jsx"
import Loading from "../components/Loading.jsx"
import FormRequiredModal from "../components/FormRequiredModal.jsx"
import StatusBadge, { StatusNote } from "../components/StatusBadge.jsx"
import bannerImg from './../assets/banner.png'
import profilePic from './../assets/user.png'
import { useRecipientStore } from '../store/useRecipientStore.jsx'
import { useAuthStore } from "@/store/useAuthStore.jsx"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog.jsx"
import { Button } from "@/components/ui/button.jsx"
import { formatTimeLeft, isDeadlinePassed } from "../lib/deadline.js"
import { formatBloodNeededDate } from "../lib/bloodNeededDate.js"
import { formatDonationDate } from "../lib/donationWindow.js"
import { recipientAction } from "../lib/requestStatus.js"

/**
 * A blood requirement, as a donor sees it.
 *
 * The attendee's phone number and the contact email are only in the response once there is a live
 * request between the donor and this recipient, so they are rendered from what arrived rather than
 * masked here - the page used to call .toString() and .charAt() on them, which threw for any donor
 * who had not yet sent or received a request.
 *
 * The availability toggle that used to sit in the header is gone for good: it edited the *viewer's*
 * own availability from somebody else's profile.
 */

const Field = ({ label, value, icon: Icon, span = "" }) => (
    <div className={`p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 ${span}`}>
        <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium flex items-center gap-1.5">
            {Icon && <Icon className="size-3.5" />} {label}
        </span>
        <p className="text-base sm:text-lg font-semibold mt-1 text-neutral-900 dark:text-white break-words">
            {value || value === 0 ? value : "Not provided"}
        </p>
    </div>
)

const SectionHeader = ({ icon: Icon, title, subtitle, tone = "red", children }) => (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${tone === "blue"
                ? "bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                : "bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400"}`}>
                {Icon && <Icon className="size-5" />}
            </div>
            <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">{title}</h2>
                {subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
            </div>
        </div>
        {children}
    </div>
)

const StatCard = ({ label, icon: Icon, tone, children }) => (
    <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {label}
            </span>
            <div className={`p-2 rounded-xl ${tone}`}>
                {Icon && <Icon className="size-5" />}
            </div>
        </div>
        <div className="mt-3">{children}</div>
    </div>
)

const SingleRequest = () => {

    const navigate = useNavigate()
    const { id: recipientId } = useParams()
    const {
        recipient, getRecipient, isRecipientLoading,
        acceptRequest, rejectRequest, confirmedRequest, rejectAcceptedRequest,
        isAcceptReq, isRejectRequest
    } = useRecipientStore()
    const { isUserAsDonor, isCheckAuth } = useAuthStore()

    const [showDonorModal, setShowDonorModal] = useState(false)
    const [forcedDonorModal, setForcedDonorModal] = useState(false)

    // getRecipient is a zustand action and never changes identity, so it is safe in the deps
    useEffect(() => {
        getRecipient(recipientId)
    }, [recipientId, getRecipient])

    // Auto-show forced popup on page load if the user has not filled the donor form. Waits for the
    // auth check to resolve to avoid a false positive on first render.
    useEffect(() => {
        if (!isCheckAuth && !isUserAsDonor) setForcedDonorModal(true)
        else if (!isCheckAuth && isUserAsDonor) setForcedDonorModal(false)
    }, [isCheckAuth, isUserAsDonor])

    const detail = recipient.recipientDetail || {}
    const profile = recipient.recipientProfile || {}
    const request = recipient.request || null

    // Closed means nothing can be done with it: the donation happened, the sweeper flagged it, or
    // the blood-needed date has simply passed and the next sweep has not run yet.
    const requestClosed = Boolean(
        detail.isFulfilled || detail.isExpired ||
        (detail.expiresAt && new Date(detail.expiresAt) <= new Date())
    )

    // One decision for the pill, the sentence and the buttons.
    const action = recipientAction({
        status: request?.status,
        viewerIsDonor: isUserAsDonor,
        donorCommitted: Boolean(recipient.viewerDonorCommitted),
        committedToThisRecipient: Boolean(recipient.viewerCommittedHere),
        requestClosed,
    })

    // Somebody else is already carrying this requirement. Said plainly rather than by hiding the
    // page, because a donor arriving from a stale list deserves to know why Accept is not there.
    const takenByAnotherDonor = Boolean(recipient.isInProgress) && !recipient.viewerCommittedHere

    const hasContact = Boolean(detail.AttendeesPhno || detail.email)
    const hospital = detail.hospitalInfo?.trim()
    const note = detail.note?.trim()

    const guardDonorForm = () => {
        if (!isUserAsDonor) {
            setShowDonorModal(true)
            return false
        }
        return true
    }

    if (isRecipientLoading && !detail._id) return <Loading />

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors duration-300 pb-16">
            {/* Forced page-load popup when the donor form is not filled */}
            <FormRequiredModal isOpen={forcedDonorModal} onClose={() => { }} userType="donor" forced={true} />
            {/* Action-triggered popup (clicking Accept or Reject without the donor form) */}
            <FormRequiredModal isOpen={showDonorModal} onClose={() => setShowDonorModal(false)} userType="donor" />

            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">

                <button
                    onClick={() => navigate('/allrequests')}
                    className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="size-4" /> Back to requests
                </button>

                {/* ===================== HERO ===================== */}
                <div className="relative rounded-3xl overflow-hidden shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <div className="relative w-full h-40 sm:h-56 lg:h-64 bg-neutral-800">
                        <img src={profile.banner || bannerImg} alt="Cover" className="w-full h-full object-cover object-center" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex flex-col items-end gap-2">
                            {detail.isCritical && request?.status !== "finalState" && !requestClosed && (
                                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-600 text-white text-xs sm:text-sm font-bold shadow-lg border border-white/20 animate-pulse">
                                    <Siren className="size-4" /> Emergency
                                </span>
                            )}
                            {takenByAnotherDonor && (
                                <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-500/90 backdrop-blur-md text-white text-xs sm:text-sm font-bold shadow-lg border border-white/20">
                                    <Lock className="size-4" /> In Progress
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="relative px-6 sm:px-10 pb-8">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-20">
                            <div className="relative inline-block self-center sm:self-auto">
                                <div className="size-28 sm:size-36 rounded-full ring-4 sm:ring-6 ring-white dark:ring-neutral-900 overflow-hidden shadow-2xl bg-white dark:bg-neutral-800">
                                    <img src={profile.profile || profilePic} alt={profile.username || "Recipient"} className="w-full h-full object-cover" />
                                </div>
                            </div>

                            {request?.status && (
                                <div className="self-center sm:self-auto sm:mb-2">
                                    <StatusBadge meta={action} />
                                </div>
                            )}
                        </div>

                        <div className="mt-4 text-center sm:text-left">
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
                                {profile.username || "Recipient"}
                            </h1>
                            <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                                <span className="inline-flex items-center gap-1.5 font-bold text-red-600 dark:text-red-500">
                                    <Droplets className="size-4 fill-current" /> {detail.bloodType || "Blood group not set"} needed
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="size-4" /> {[detail.place, detail.location].filter(Boolean).join(", ") || "Location not set"}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <CalendarClock className="size-4" /> Needed by {formatBloodNeededDate(detail.reqDate) || "date not set"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===================== REQUIREMENT AT A GLANCE ===================== */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    <StatCard label="Blood Group" icon={Droplets} tone="bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
                        <span className="text-3xl font-black text-red-600 dark:text-red-500">{detail.bloodType || "--"}</span>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Requested blood group</p>
                    </StatCard>

                    <StatCard label="Units Needed" icon={HeartPulse} tone="bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                        <span className="text-3xl font-black text-neutral-900 dark:text-white">{detail.bloodUnits ?? "--"}</span>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            {detail.bloodUnits === 1 ? "Single unit donation" : "Units required in total"}
                        </p>
                    </StatCard>

                    <StatCard label="Needed By" icon={CalendarClock} tone="bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                        <span className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white block truncate">
                            {formatBloodNeededDate(detail.reqDate) || "Not set"}
                        </span>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            The request closes at the end of this day
                        </p>
                    </StatCard>

                    <StatCard label="Requester Donations" icon={Award} tone="bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
                        <span className="text-3xl font-black text-neutral-900 dark:text-white">{profile.donation || 0}</span>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            {profile.createdAt ? `Member since ${formatDonationDate(profile.createdAt)}` : "Blood Line member"}
                        </p>
                    </StatCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">

                    {/* ===================== PATIENT AND REQUIREMENT ===================== */}
                    <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                        <SectionHeader icon={User} title="Patient Details" subtitle="Who the blood is for" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <Field label="Patient's Name" value={detail.patientsName} span="col-span-2 sm:col-span-1" />
                            <Field label="Patient's Age" value={detail.patientsage ? `${detail.patientsage} Years` : ""} />
                            <Field label="Gender" value={detail.gender} />
                            <Field label="Blood Group" value={detail.bloodType} icon={Droplets} />
                            <Field label="Units Needed" value={detail.bloodUnits} />
                            <Field label="Blood Needed By" value={formatBloodNeededDate(detail.reqDate)} icon={CalendarClock} />
                            <Field label="District" value={detail.location} icon={MapPin} />
                            <Field label="Place" value={detail.place} />
                            <Field label="Pincode" value={detail.pinCode} />
                            {hospital && (
                                <Field label="Hospital" value={hospital} icon={Building2} span="col-span-2 sm:col-span-3" />
                            )}
                            {note && (
                                <Field label="Note from the Requester" value={note} icon={FileText} span="col-span-2 sm:col-span-3" />
                            )}
                        </div>

                        {/* Contact details, and only if the server sent them. A donor with a live
                            request gets them so the donation can be arranged; a stranger browsing
                            the directory does not. */}
                        <div className="mt-6">
                            <SectionHeader icon={Phone} title="Attendee and Contact" subtitle="Shared only with a live request" tone="blue" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Attendee's Name" value={detail.AttendeesName} icon={Users} />
                                {hasContact && <Field label="Attendee's Mobile" value={detail.AttendeesPhno} icon={Phone} />}
                                {hasContact && <Field label="Email" value={detail.email} icon={Mail} span="sm:col-span-2" />}
                            </div>
                            {!hasContact && (
                                <div className="mt-4 flex items-start gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                                    <Lock className="size-5 shrink-0 mt-0.5 text-neutral-500 dark:text-neutral-400" />
                                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                                        The attendee's phone number and email address stay private until there is
                                        a request between you. Accept this request, and you will both be able to
                                        contact each other to arrange the donation.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ===================== STATUS AND ACTIONS ===================== */}
                    <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm h-fit lg:sticky lg:top-24">
                        <SectionHeader icon={FileText} title="This Request" subtitle="What you can do right now" />

                        <StatusNote meta={action} />

                        {/* the backend expires an acceptance that is never carried through to a
                            confirmed donation, so the donor can see how long is left */}
                        {request?.respondBy && (
                            <p className="mt-3 flex items-start gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <TriangleAlert className="size-3.5 shrink-0 mt-0.5" />
                                {isDeadlinePassed(request.respondBy)
                                    ? "This acceptance has expired and is being released"
                                    : `Confirm the donation within ${formatTimeLeft(request.respondBy)} or this acceptance expires`}
                            </p>
                        )}

                        {takenByAnotherDonor && !request?.status && (
                            <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-blue-300 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-500/10 px-4 py-3">
                                <Lock className="size-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                                <div className="text-sm">
                                    <p className="font-bold text-blue-700 dark:text-blue-300">A donor is already confirmed</p>
                                    <p className="text-neutral-700 dark:text-neutral-300 mt-1">
                                        This requirement is being served, so it has left the requests directory
                                        and cannot be accepted. It reopens only if that donation is cancelled.
                                    </p>
                                </div>
                            </div>
                        )}

                        {requestClosed && (
                            <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-yellow-400 bg-yellow-50 dark:border-yellow-500/60 dark:bg-yellow-500/10 px-4 py-3">
                                <TriangleAlert className="size-5 shrink-0 mt-0.5 text-yellow-600 dark:text-yellow-400" />
                                <div className="text-sm">
                                    <p className="font-bold text-yellow-700 dark:text-yellow-300">
                                        {detail.isFulfilled ? "This request has been fulfilled" : "This request is no longer active"}
                                    </p>
                                    <p className="text-neutral-700 dark:text-neutral-300 mt-1">
                                        {detail.isFulfilled
                                            ? "A donation was completed for this requirement, so it is closed."
                                            : "The date the blood was needed has passed, so this requirement is closed."}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="mt-5 flex flex-col gap-3">
                            {action.kind === "respond" && (
                                <>
                                    <Button
                                        onClick={async () => {
                                            if (!guardDonorForm()) return
                                            // stay on the page when the server refuses, so the donor
                                            // actually sees why (already committed elsewhere)
                                            const accepted = await acceptRequest(request?._id)
                                            if (accepted) navigate('/allrequests')
                                        }}
                                        disabled={isAcceptReq}
                                        className="w-full rounded-2xl px-5 py-6 font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all cursor-pointer"
                                    >
                                        {isAcceptReq
                                            ? <><Loader2 className="size-4 animate-spin" /> Accepting</>
                                            : <><CheckCheck className="size-4" /> Accept Request</>}
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            if (!guardDonorForm()) return
                                            rejectRequest(request?._id)
                                            navigate('/allrequests')
                                        }}
                                        disabled={isRejectRequest}
                                        className="w-full rounded-2xl px-5 py-6 font-bold bg-neutral-100 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 shadow-sm transition-all cursor-pointer"
                                    >
                                        <X className="size-4" /> Reject
                                    </Button>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        Accepting commits you to this requirement until it completes or is
                                        cancelled, so you will not be able to accept another one meanwhile.
                                    </p>
                                </>
                            )}

                            {action.kind === "confirm" && (
                                <>
                                    <Button
                                        onClick={() => { confirmedRequest(request?._id); navigate('/allrequests') }}
                                        disabled={isAcceptReq}
                                        className="w-full rounded-2xl px-5 py-6 font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all cursor-pointer"
                                    >
                                        {isAcceptReq
                                            ? <><Loader2 className="size-4 animate-spin" /> Confirming</>
                                            : <><CheckCheck className="size-4" /> Confirm Donation</>}
                                    </Button>
                                    <Button
                                        onClick={() => { rejectAcceptedRequest(request?._id); navigate('/allrequests') }}
                                        disabled={isRejectRequest}
                                        className="w-full rounded-2xl px-5 py-6 font-bold bg-rose-50 dark:bg-rose-950/40 border-2 border-red-500 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white shadow-sm transition-all cursor-pointer"
                                    >
                                        <X className="size-4" /> Cancel
                                    </Button>
                                </>
                            )}

                            {action.kind === "otp" && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button className="w-full rounded-2xl px-5 py-6 font-bold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-md hover:shadow-red-600/30 transition-all cursor-pointer">
                                            <Smartphone className="size-4" /> Generate OTP
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-2">
                                                <CircleAlert className="size-5 text-red-600 dark:text-red-400" /> Have you completed the donation?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Generate the OTP only after you have donated. It is emailed to the
                                                recipient's registered address; they share it with you, you verify
                                                it here, and the donation is recorded as complete.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="rounded-2xl border border-neutral-300 dark:border-neutral-700">Not yet</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => navigate(`/${request?._id}/otp`)} className="rounded-2xl bg-red-600 text-white hover:bg-red-500">
                                                Yes, generate OTP
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}

                            {action.kind === "view" && (
                                <Button
                                    onClick={() => setShowDonorModal(true)}
                                    className="w-full rounded-2xl px-5 py-6 font-bold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-md transition-all cursor-pointer"
                                >
                                    <FileText className="size-4" /> Fill the Donor Form
                                </Button>
                            )}

                            {action.kind === "locked" && (
                                <Button
                                    onClick={() => navigate('/allrequests')}
                                    className="w-full rounded-2xl px-5 py-6 font-bold bg-neutral-100 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 shadow-sm transition-all cursor-pointer"
                                >
                                    <FileText className="size-4" /> View Your Ongoing Donation
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default SingleRequest
