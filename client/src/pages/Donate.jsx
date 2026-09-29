import { useState } from "react"
import toast from "react-hot-toast"
import { useDonorStore } from "../store/useDonorStore.jsx"
import { useAuthStore } from "../store/useAuthStore.jsx"
import donoteImg from './../assets/Donate_form_bg.jpg'
import Navbar from "../components/Navbar.jsx"
import { useNavigate } from "react-router"
import { Droplets, Loader2, ShieldCheck, Activity, HeartHandshake, CheckCircle2, AlertTriangle } from "lucide-react"

const ACTIVITY_OPTIONS = [
    { value: "no", label: "None of the below" },
    { value: "tattooing", label: "Tattooing" },
    { value: "piercing", label: "Piercing" },
    { value: "dental extraction", label: "Dental extraction" },
    { value: "affected by covid", label: "Affected by Covid-19" },
    { value: "heavy fever", label: "Heavy fever" },
]

const Donate = () => {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        donatePre: "no",
        lastSixmonthActivity: "no",
    })
    const { createDonor, isCreatingDonor } = useDonorStore()
    const { isUserAsDonor, authUser } = useAuthStore()
    // a donation since the last form submission means the answers are out of date
    const needsEligibilityRefill = Boolean(authUser?.lastDonated) && authUser?.eligibilityFormCurrent === false

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.lastSixmonthActivity) return toast.error("please fill the required fields!, because it more helpful for recipients")

        // only clear the form and leave the page once the donor record actually saved,
        // otherwise a rejected submission would look like it succeeded
        const created = await createDonor(formData)
        if (!created) return

        setFormData({
            donatePre: "no",
            lastSixmonthActivity: "no",
        })
        navigate('/allrequests')
    }

    const labelClass = "block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2"
    const selectClass = "w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/70 text-neutral-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all cursor-pointer"

    return (
        <div className="relative min-h-screen">
            {/* Background image sits behind a scrim so the card and text stay readable */}
            <div
                className="fixed inset-0 bg-no-repeat bg-cover bg-center"
                style={{ backgroundImage: `url(${donoteImg})` }}
                aria-hidden="true"
            />
            <div className="fixed inset-0 bg-neutral-100/80 dark:bg-neutral-950/85 backdrop-blur-sm" aria-hidden="true" />

            <div className="relative flex flex-col items-center w-full min-h-screen pb-16">
                <Navbar />

                <div className="w-full max-w-2xl px-4 sm:px-6 mt-8 sm:mt-12">
                    {/* Page heading */}
                    <div className="text-center mb-6 sm:mb-8">
                        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/10 dark:bg-red-500/15 border border-red-500/30 text-red-700 dark:text-red-400 text-xs font-bold uppercase tracking-wider">
                            <Droplets className="size-3.5 fill-current" />
                            Donor Registration
                        </span>
                        <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 dark:text-white">
                            Blood Donation Consent Form
                        </h1>
                        <p className="mt-2 text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
                            Your donation is a gift of hope and healing.
                        </p>
                    </div>

                    {/* Form card */}
                    <form
                        onSubmit={handleSubmit}
                        className="rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden"
                    >
                        <div className="flex items-center gap-3 px-6 sm:px-8 py-5 border-b border-neutral-100 dark:border-neutral-800">
                            <span className="flex items-center justify-center size-10 shrink-0 rounded-xl bg-red-600 text-white shadow-md shadow-red-600/30">
                                <HeartHandshake className="size-5" />
                            </span>
                            <div>
                                <h2 className="text-base font-bold text-neutral-900 dark:text-white">Eligibility Details</h2>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                    These answers help recipients know whether you can donate safely.
                                </p>
                            </div>
                        </div>

                        <div className="px-6 sm:px-8 py-6 space-y-5">
                            <div>
                                <label htmlFor="lastSixmonthActivity" className={labelClass}>
                                    Last six months activity
                                </label>
                                <select
                                    id="lastSixmonthActivity"
                                    className={selectClass}
                                    value={formData.lastSixmonthActivity}
                                    onChange={(e) => setFormData({ ...formData, lastSixmonthActivity: e.target.value })}
                                    required
                                >
                                    {ACTIVITY_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                <p className="flex items-start gap-1.5 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                                    <Activity className="size-3.5 shrink-0 mt-0.5 text-red-500" />
                                    Any of these in the last six months may delay when you can donate.
                                </p>
                            </div>

                            <div>
                                <label htmlFor="donatePre" className={labelClass}>
                                    Donated previously
                                </label>
                                <select
                                    id="donatePre"
                                    className={selectClass}
                                    value={formData.donatePre}
                                    onChange={(e) => setFormData({ ...formData, donatePre: e.target.value })}
                                    required
                                >
                                    <option value="no">No, this is my first time</option>
                                    <option value="yes">Yes, I have donated before</option>
                                </select>
                            </div>

                            <div className="flex items-start gap-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 px-4 py-3">
                                <ShieldCheck className="size-4 shrink-0 mt-0.5 text-emerald-500" />
                                <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                                    By submitting, you consent to appear in the Find Donors directory and to receive
                                    blood requests from recipients. You can turn your availability off any time from your profile.
                                </p>
                            </div>
                        </div>

                        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                            <button
                                type="submit"
                                disabled={isCreatingDonor}
                                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold shadow-lg shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer"
                            >
                                {isCreatingDonor ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Droplets className="size-4 fill-current" />
                                        {isUserAsDonor ? "Update My Donor Details" : "Ready to Donate"}
                                    </>
                                )}
                            </button>

                            {isUserAsDonor && (
                                needsEligibilityRefill ? (
                                    <p className="flex items-start justify-center gap-1.5 mt-3 text-xs font-semibold text-yellow-600 dark:text-yellow-400 text-center">
                                        <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                                        You have donated since you last filled this form. Please
                                        submit it again to confirm your current eligibility.
                                    </p>
                                ) : (
                                    <p className="flex items-center justify-center gap-1.5 mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle2 className="size-3.5" />
                                        Your donor form is already complete.
                                    </p>
                                )
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Donate
