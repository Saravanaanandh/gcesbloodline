import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import {
    ArrowLeft, Award, BadgeCheck, Ban, Calendar, CalendarClock, CheckCircle2, CircleAlert,
    Droplets, FileText, Heart, Loader2, Lock, Mail, MapPin, Phone, SendHorizonal, ShieldCheck,
    Trash2, TriangleAlert, User, X,
} from "lucide-react"
import Navbar from "../components/Navbar.jsx"
import Loading from "../components/Loading.jsx"
import FormRequiredModal from "../components/FormRequiredModal.jsx"
import StatusBadge, { StatusNote } from "../components/StatusBadge.jsx"
import bannerImg from './../assets/banner.png'
import profilePic from './../assets/user.png'
import { useDonorStore } from "../store/useDonorStore.jsx"
import { useRecipientStore } from '../store/useRecipientStore.jsx'
import { useAuthStore } from "../store/useAuthStore.jsx"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog.jsx"
import { Button } from "@/components/ui/button.jsx"
import { formatTimeLeft, isDeadlinePassed } from "../lib/deadline.js"
import { formatDonationDate } from "../lib/donationWindow.js"
import { donorAction } from "../lib/requestStatus.js"

/**
 * A donor's public profile, as a recipient sees it.
 *
 * Two things this page deliberately does not do.
 *
 * It does not show medical answers. `donatePre` and `lastSixmonthActivity` used to be rendered
 * here; they are eligibility answers belonging to the donor, the server no longer returns them to
 * anybody else, and a recipient has no reason to see them.
 *
 * It does not assume contact details are present. Email and phone number arrive only once there is
 * a live request between the two people, so every field is rendered from whatever the server sent
 * rather than masked here - the page used to call .charAt and .toString on them, which threw for
 * any stranger opening the profile the moment the server started withholding them.
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

const SingleDonor = () => {

    const navigate = useNavigate()
    const { id: donorRecordId } = useParams()
    const { isUserAsRecipient, isCheckAuth } = useAuthStore()
    const { getDonor, singleDonor, isDonorLoading } = useDonorStore()
    const {
        sendRequest, rejectRequest, confirmRequest, deleteRequest, cancelConfirmedRequest,
        isSendRequest, isCancellingRequest, isAcceptReq, isRejectRequest
    } = useRecipientStore()

    const [showFormModal, setShowFormModal] = useState(false)
    const [forcedModal, setForcedModal] = useState(false)

    // getDonor is a zustand action and never changes identity, so it is safe in the dependency list
    useEffect(() => {
        getDonor(donorRecordId)
    }, [donorRecordId, getDonor])

    // Auto-show forced popup on page load if the user has not filled the recipient form. Waits for
    // the auth check so it cannot flash for a recipient whose profile has not loaded yet.
    useEffect(() => {
        if (!isCheckAuth && !isUserAsRecipient) setForcedModal(true)
        else if (!isCheckAuth && isUserAsRecipient) setForcedModal(false)
    }, [isCheckAuth, isUserAsRecipient])

    // donor    - the Donor record: ids and isCommitted, nothing medical
    // profile  - the User profile, already masked to this viewer's tier by the server
    // request  - the live request between this donor and this viewer, if there is one
    const donor = singleDonor.donor || {}
    const profile = singleDonor.donorDetail || {}
    const request = singleDonor.requestDetail || null
    const closedReason = singleDonor.bloodRequestClosedReason || null
    const requestClosed = Boolean(singleDonor.bloodRequestExpired)

    // One decision for the pill, the sentence and the button, so they cannot contradict each other.
    const action = donorAction({
        status: request?.status,
        donorIsCommitted: Boolean(donor.isCommitted),
        viewerIsRecipient: isUserAsRecipient,
        viewerCommitted: Boolean(singleDonor.viewerCommitted),
        viewerCommittedDonorId: singleDonor.viewerCommittedDonorId,
        donorId: donor.donorId,
        requestClosed,
        closedReason,
    })

    // Contact details are the server's decision, not a formatting one: they are simply absent
    // until this viewer has a live request with the donor.
    const hasContact = Boolean(profile.email || profile.mobile)

    const handleSendRequest = async () => {
        if (!isUserAsRecipient) {
            setShowFormModal(true)
            return
        }
        // profile._id is the donor's user id, which is what the request is raised against;
        // donor._id is the donor record, which is how their profile is looked up afterwards for
        // the notification email. Passing profile.donorId here used to send undefined, because
        // that field is only returned to the donor themselves.
        const sent = await sendRequest(profile._id, donor._id)
        if (sent) navigate('/alldonors')
    }

    const handleClickDelete = async (id) => {
        await deleteRequest(id)
        navigate('/alldonors')
    }

    // The donor agreed but has gone quiet, or has said they cannot donate after all. Cancelling
    // releases both commitment locks on the server, so the recipient can approach somebody else
    // without waiting for the blood-needed date to pass.
    const handleCancelDonation = async (id) => {
        const cancelled = await cancelConfirmedRequest(id)
        if (cancelled) navigate('/alldonors')
    }

    const cancelDonationControl = (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    disabled={isCancellingRequest}
                    className="rounded-2xl px-5 py-5 font-bold bg-rose-50 dark:bg-rose-950/40 border-2 border-red-500 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white shadow-sm transition-all cursor-pointer"
                >
                    {isCancellingRequest
                        ? <><Loader2 className="size-4 animate-spin" /> Cancelling</>
                        : <><X className="size-4" /> Cancel Donation</>}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this donation?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Use this if the donor is not responding or can no longer donate. The donor is
                        released and you can contact another donor for this request.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-2xl border border-neutral-300 dark:border-neutral-700">Keep waiting</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleCancelDonation(request?._id)} className="rounded-2xl bg-red-600 text-white hover:bg-red-500">
                        Cancel donation
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )

    // The six-step workflow, explained where it is about to be needed. Shown for a donation that
    // is already under way rather than as general advice.
    const otpInfoControl = (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button className="rounded-2xl px-5 py-5 font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all cursor-pointer">
                    <CircleAlert className="size-4" /> How the OTP step works
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="size-5 text-blue-600 dark:text-blue-400" /> Completing the donation
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Both sides have confirmed, so the donor now visits your location to donate.
                        Once the donation is done the donor generates an OTP, which is emailed to
                        your registered address. Share that OTP with the donor to verify it, and the
                        donation is recorded as complete.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-2xl border border-neutral-300 dark:border-neutral-700">Got it</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )

    if (isDonorLoading && !profile.username) return <Loading />

    // What the top of the page says about this donor: their own availability, unless a donation
    // has taken them - in which case whether it is ours matters more than the toggle.
    const committedToViewer = Boolean(request && ["accepted", "pending", "confirmed"].includes(request.status))
    const availability = donor.isCommitted
        ? committedToViewer
            ? { label: "Donating for your request", tone: "bg-blue-500/90", Icon: ShieldCheck }
            : { label: "In Progress with another recipient", tone: "bg-blue-500/90", Icon: Lock }
        : profile.available
            ? { label: "Available to donate", tone: "bg-emerald-500/90", Icon: CheckCircle2 }
            : { label: "Currently unavailable", tone: "bg-neutral-500/90", Icon: Ban }

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors duration-300 pb-16">
            {/* Forced page-load popup when the recipient form is not filled */}
            <FormRequiredModal isOpen={forcedModal} onClose={() => { }} userType="recipient" forced={true} />
            {/* Action-triggered popup (clicking Send Request without the recipient form) */}
            <FormRequiredModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} userType="recipient" />

            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">

                <button
                    onClick={() => navigate('/alldonors')}
                    className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="size-4" /> Back to donors
                </button>

                {/* ===================== HERO ===================== */}
                <div className="relative rounded-3xl overflow-hidden shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                    <div className="relative w-full h-40 sm:h-56 lg:h-64 bg-neutral-800">
                        <img src={profile.banner || bannerImg} alt="Cover" className="w-full h-full object-cover object-center" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        <span className={`absolute top-4 right-4 sm:top-6 sm:right-6 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-white text-xs sm:text-sm font-bold backdrop-blur-md border border-white/20 shadow-lg ${availability.tone}`}>
                            <availability.Icon className="size-4" /> {availability.label}
                        </span>
                    </div>

                    <div className="relative px-6 sm:px-10 pb-8">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-20">
                            <div className="relative inline-block self-center sm:self-auto">
                                <div className="size-28 sm:size-36 rounded-full ring-4 sm:ring-6 ring-white dark:ring-neutral-900 overflow-hidden shadow-2xl bg-white dark:bg-neutral-800">
                                    <img src={profile.profile || profilePic} alt={profile.username || "Donor"} className="w-full h-full object-cover" />
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
                                {profile.username || "Donor"}
                            </h1>
                            <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                                <span className="inline-flex items-center gap-1.5 font-bold text-red-600 dark:text-red-500">
                                    <Droplets className="size-4 fill-current" /> {profile.bloodType || "Blood group not set"}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="size-4" /> {[profile.place, profile.location].filter(Boolean).join(", ") || "Location not set"}
                                </span>
                                {profile.createdAt && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Calendar className="size-4" /> Joined {formatDonationDate(profile.createdAt)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===================== DONATION STATISTICS ===================== */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    <StatCard label="Blood Group" icon={Droplets} tone="bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
                        <span className="text-3xl font-black text-red-600 dark:text-red-500">{profile.bloodType || "--"}</span>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            {profile.bloodType === "O-" ? "Universal Blood Donor"
                                : profile.bloodType === "AB+" ? "Universal Blood Recipient"
                                    : "Lifesaving Donor Match"}
                        </p>
                    </StatCard>

                    <StatCard label="Total Donations" icon={Award} tone="bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                        <span className="text-3xl font-black text-neutral-900 dark:text-white">{profile.donation || 0}</span>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                            ~{(profile.donation || 0) * 3} Lives Impacted
                        </p>
                    </StatCard>

                    <StatCard label="Last Donated" icon={Calendar} tone="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                        <span className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white block truncate">
                            {formatDonationDate(profile.lastDonated) || "No donations yet"}
                        </span>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Most recent completed donation</p>
                    </StatCard>

                    <StatCard label="Next Eligible" icon={CalendarClock} tone="bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
                        <span className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white block truncate">
                            {profile.nextDonationDate ? formatDonationDate(profile.nextDonationDate) : "Eligible now"}
                        </span>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            Estimate only - a blood bank confirms eligibility
                        </p>
                    </StatCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">

                    {/* ===================== DONOR DETAILS ===================== */}
                    <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                        <SectionHeader icon={User} title="Donor Details" subtitle="Public profile information" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <Field label="Full Name" value={profile.username} span="col-span-2 sm:col-span-1" />
                            <Field label="Age" value={profile.age ? `${profile.age} Years` : ""} />
                            <Field label="Gender" value={profile.gender} />
                            <Field label="Blood Group" value={profile.bloodType} icon={Droplets} />
                            <Field label="District" value={profile.location} icon={MapPin} />
                            <Field label="Place" value={profile.place} />
                            <Field label="Pincode" value={profile.pinCode} />
                            <Field label="Availability" value={profile.available ? "Available" : "Unavailable"} />
                            <Field label="Registered Donor" value={profile.isDonor ? "Yes" : "No"} icon={BadgeCheck} />
                        </div>

                        {/* Contact details, and only if the server sent them. It does that once there
                            is a live request between these two people, so they can ring each other
                            to arrange the donation - and not before. */}
                        <div className="mt-6">
                            <SectionHeader icon={Phone} title="Contact Details" subtitle="Shared only with a live request" tone="blue" />
                            {hasContact ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Email" value={profile.email} icon={Mail} />
                                    <Field label="Mobile Number" value={profile.mobile} icon={Phone} />
                                </div>
                            ) : (
                                <div className="flex items-start gap-3 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                                    <Lock className="size-5 shrink-0 mt-0.5 text-neutral-500 dark:text-neutral-400" />
                                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                                        This donor's email address and phone number stay private until there is
                                        a request between you. Send a request, and you will both be able to
                                        contact each other to arrange the donation.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ===================== REQUEST STATUS AND ACTIONS ===================== */}
                    <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm h-fit lg:sticky lg:top-24">
                        <SectionHeader icon={FileText} title="Your Request" subtitle="Status of your request to this donor" />

                        <StatusNote meta={action} />

                        {/* the backend expires an acceptance that is never confirmed, so the
                            recipient can see how long is left before choosing another donor */}
                        {request?.respondBy && (
                            <p className="mt-3 flex items-start gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                <TriangleAlert className="size-3.5 shrink-0 mt-0.5" />
                                {isDeadlinePassed(request.respondBy)
                                    ? "This acceptance has expired and is being released"
                                    : `${formatTimeLeft(request.respondBy)} to complete this donation, or reject and choose another donor`}
                            </p>
                        )}

                        {/* A fulfilled request is a success and gets its own copy: nothing to
                            extend, just an invitation to raise the next one. */}
                        {requestClosed && closedReason === "fulfilled" && (
                            <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-500/10 px-4 py-3">
                                <Heart className="size-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                                <div className="text-sm">
                                    <p className="font-bold text-emerald-700 dark:text-emerald-300">Your blood request is fulfilled</p>
                                    <p className="text-neutral-700 dark:text-neutral-300 mt-1">
                                        A donation was completed for this request, so it is closed and kept in
                                        your request history. If more blood is needed, submit the Blood Request
                                        Form again to raise a new one.
                                    </p>
                                </div>
                            </div>
                        )}
                        {requestClosed && closedReason !== "fulfilled" && (
                            <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-yellow-400 bg-yellow-50 dark:border-yellow-500/60 dark:bg-yellow-500/10 px-4 py-3">
                                <TriangleAlert className="size-5 shrink-0 mt-0.5 text-yellow-600 dark:text-yellow-400" />
                                <div className="text-sm">
                                    <p className="font-bold text-yellow-700 dark:text-yellow-300">Your blood request is no longer active</p>
                                    <p className="text-neutral-700 dark:text-neutral-300 mt-1">
                                        The date you needed the blood has passed, so this request is closed.
                                        Submit a new request with a new date to contact donors again.
                                    </p>
                                    <Button onClick={() => navigate('/request')} className="mt-3 rounded-2xl bg-red-600 text-white hover:bg-red-500">
                                        Raise a new request
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="mt-5 flex flex-col gap-3">
                            {action.kind === "send" && (
                                <Button
                                    onClick={handleSendRequest}
                                    disabled={isSendRequest}
                                    className="w-full rounded-2xl px-5 py-6 font-bold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-md hover:shadow-red-600/30 transition-all cursor-pointer"
                                >
                                    {isSendRequest
                                        ? <><Loader2 className="size-4 animate-spin" /> Sending</>
                                        : <><SendHorizonal className="size-4" /> Send Request</>}
                                </Button>
                            )}

                            {action.kind === "pending" && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button className="w-full rounded-2xl px-5 py-6 font-bold bg-rose-50 dark:bg-rose-950/40 border-2 border-red-500 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white shadow-sm transition-all cursor-pointer">
                                            <Trash2 className="size-4" /> Withdraw Request
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Withdraw this request?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                The donor will no longer see it. You can send them a new request later.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="rounded-2xl border border-neutral-300 dark:border-neutral-700">Keep it</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleClickDelete(request?._id)} className="rounded-2xl bg-red-600 text-white hover:bg-red-500">
                                                Withdraw
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}

                            {action.kind === "confirm" && (
                                <>
                                    <Button
                                        onClick={async () => {
                                            // stay on the page when the server refuses, so the
                                            // recipient sees why (a donor is already confirmed)
                                            const confirmed = await confirmRequest(request?._id)
                                            if (confirmed) navigate('/alldonors')
                                        }}
                                        disabled={isAcceptReq}
                                        className="w-full rounded-2xl px-5 py-6 font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all cursor-pointer"
                                    >
                                        {isAcceptReq
                                            ? <><Loader2 className="size-4 animate-spin" /> Confirming</>
                                            : <><CheckCircle2 className="size-4" /> Confirm This Donor</>}
                                    </Button>
                                    <Button
                                        onClick={() => { rejectRequest(request?._id); navigate('/alldonors') }}
                                        disabled={isRejectRequest}
                                        className="w-full rounded-2xl px-5 py-6 font-bold bg-neutral-100 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 shadow-sm transition-all cursor-pointer"
                                    >
                                        <X className="size-4" /> Reject
                                    </Button>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        Confirming this donor closes your request to everybody else. The other
                                        donors are told the requirement is taken - not that you rejected them.
                                    </p>
                                </>
                            )}

                            {action.kind === "inprogress" && (
                                <>
                                    {request?.status === "confirmed" && otpInfoControl}
                                    {cancelDonationControl}
                                    <Button
                                        onClick={() => navigate('/myrequest')}
                                        className="w-full rounded-2xl px-5 py-6 font-bold bg-neutral-100 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 shadow-sm transition-all cursor-pointer"
                                    >
                                        <FileText className="size-4" /> View Request
                                    </Button>
                                </>
                            )}

                            {(action.kind === "locked" || action.kind === "completed") && (
                                <Button
                                    onClick={() => navigate('/myrequest')}
                                    className="w-full rounded-2xl px-5 py-6 font-bold bg-neutral-100 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 shadow-sm transition-all cursor-pointer"
                                >
                                    <FileText className="size-4" /> View Request
                                </Button>
                            )}

                            {action.kind === "view" && (
                                <Button
                                    onClick={() => setShowFormModal(true)}
                                    className="w-full rounded-2xl px-5 py-6 font-bold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-md transition-all cursor-pointer"
                                >
                                    <FileText className="size-4" /> Fill the Blood Request Form
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default SingleDonor
