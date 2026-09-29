import { useState } from "react"
import { useRecipientStore } from "../store/useRecipientStore.jsx"
import toast from "react-hot-toast"
import Navbar from "../components/Navbar.jsx"
import { useNavigate } from "react-router"
import { useAuthStore } from "@/store/useAuthStore.jsx"
import HospitalAutocomplete from "../components/HospitalAutocomplete.jsx"
import { AlertCircle, Droplets, Info, Loader2, User } from "lucide-react"
import { MAX_BLOOD_UNITS, UNITS_HINT, validateBloodUnits } from "../lib/bloodUnits.js"
import { BLOOD_NEEDED_HINT, BLOOD_NEEDED_LABEL, todayIST, validateBloodNeededDate } from "../lib/bloodNeededDate.js"

const Field = ({ label, required, hint, children }) => (
    <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
        {hint && (
            <span className="flex items-start gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                <Info className="size-3.5 shrink-0 mt-0.5" />{hint}
            </span>
        )}
    </div>
)

const SectionHeader = ({ title }) => (
    <h3 className="text-sm font-semibold uppercase tracking-wide text-red-600 dark:text-red-400 border-b border-red-100 dark:border-red-900 pb-1 mb-1">
        {title}
    </h3>
)

const inputCls = "border border-neutral-300 dark:border-neutral-600 dark:text-black rounded-md outline-none bg-white px-3 py-2 text-sm focus:border-red-400 focus:ring-1 focus:ring-red-200 transition-colors"

// A read-only summary pill so the recipient can see what will be submitted
const InfoPill = ({ label, value }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{label}</span>
        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{value || "—"}</span>
    </div>
)

const RequestMe = () => {
    const navigate = useNavigate()
    const { authUser } = useAuthStore()
    const { createRecipient, isCreatingRecipient } = useRecipientStore()

    const [formData, setFormData] = useState({
        bloodType: authUser.bloodType,
        patientsName: authUser.username,
        patientsage: authUser.age,
        AttendeesName: "",
        AttendeesPhno: "",
        gender: authUser.gender,
        email: authUser.email,
        location: authUser.location,
        place: authUser.place,
        pinCode: authUser.pinCode,
        reqDate: todayIST(),
        bloodUnits: "",
        isCritical: true,
        hospitalInfo: "",
        note: ""
    })

    const set = (patch) => setFormData(prev => ({ ...prev, ...patch }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.reqDate || !formData.bloodUnits || !formData.AttendeesName || !formData.AttendeesPhno)
            return toast.error("Please fill all required fields")
        if (formData.AttendeesPhno.toString().length !== 10) return toast.error("Mobile number must be 10 digits")
        const dateError = validateBloodNeededDate(formData.reqDate)
        if (dateError) return toast.error(dateError)
        const unitsError = validateBloodUnits(formData.bloodUnits)
        if (unitsError) return toast.error(unitsError)

        const created = await createRecipient({
            ...formData,
            hospitalInfo: formData.hospitalInfo ? formData.hospitalInfo.trim() : ""
        })
        if (!created) return

        setFormData(prev => ({
            ...prev,
            AttendeesName: "",
            AttendeesPhno: "",
            reqDate: todayIST(),
            bloodUnits: "",
            isCritical: true,
            hospitalInfo: "",
            note: ""
        }))
        navigate('/alldonors')
    }

    return (
        <div className="min-h-screen">
            <Navbar />
            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Page header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40">
                        <Droplets className="size-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">Request Blood for Myself</h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Your profile details will be submitted automatically</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    {/* Pre-filled profile summary — read-only so the recipient sees what will be sent */}
                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <User className="size-4 text-neutral-500" />
                            <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                                Your Details (pre-filled from profile)
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <InfoPill label="Name" value={authUser.username} />
                            <InfoPill label="Blood Group" value={authUser.bloodType} />
                            <InfoPill label="Age" value={authUser.age} />
                            <InfoPill label="Gender" value={authUser.gender} />
                            <InfoPill label="Location" value={authUser.location} />
                            <InfoPill label="Email" value={authUser.email} />
                        </div>
                        <p className="mt-4 flex items-start gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                            <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                            To update these details, edit your profile first, then resubmit this form.
                        </p>
                    </div>

                    {/* Who is attending */}
                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-5 flex flex-col gap-4">
                        <SectionHeader title="Attendee Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Attendee's Name" required>
                                <input
                                    type="text"
                                    className={inputCls}
                                    placeholder="Name of the person attending"
                                    value={formData.AttendeesName}
                                    onChange={(e) => set({ AttendeesName: e.target.value })}
                                    required
                                />
                            </Field>
                            <Field label="Attendee's Phone" required>
                                <input
                                    type="tel"
                                    className={inputCls}
                                    placeholder="10-digit mobile number"
                                    value={formData.AttendeesPhno || ""}
                                    onChange={(e) => set({ AttendeesPhno: parseInt(e.target.value) })}
                                    required
                                />
                            </Field>
                        </div>
                    </div>

                    {/* Blood request details */}
                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-5 flex flex-col gap-4">
                        <SectionHeader title="Blood Request Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label={BLOOD_NEEDED_LABEL} required hint={BLOOD_NEEDED_HINT}>
                                <input
                                    type="date"
                                    className={inputCls}
                                    value={formData.reqDate || ""}
                                    min={todayIST()}
                                    onChange={(e) => set({ reqDate: e.target.value })}
                                    required
                                />
                            </Field>
                            <Field label="Required Blood Units" required hint={UNITS_HINT}>
                                <input
                                    type="number"
                                    min={1}
                                    max={MAX_BLOOD_UNITS}
                                    step={1}
                                    className={inputCls}
                                    placeholder={`1 to ${MAX_BLOOD_UNITS} units`}
                                    value={formData.bloodUnits || ""}
                                    onChange={(e) => set({ bloodUnits: parseInt(e.target.value) })}
                                    required
                                />
                            </Field>
                            <div className="sm:col-span-2">
                                <Field label="Hospital Name (optional)">
                                    <HospitalAutocomplete
                                        id="hospitalInfo"
                                        name="hospitalInfo"
                                        value={formData.hospitalInfo || ""}
                                        onChange={(val) => set({ hospitalInfo: val })}
                                        placeholder="Search or enter hospital name"
                                        className={inputCls + " w-full"}
                                    />
                                </Field>
                            </div>
                        </div>

                        {/* Emergency */}
                        <div className="flex flex-wrap items-center gap-4 pt-1">
                            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Is it an emergency?</span>
                            <div className="flex gap-5">
                                {[{ label: "Yes", val: true }, { label: "No", val: false }].map(({ label, val }) => (
                                    <label key={label} className="flex items-center gap-1.5 cursor-pointer text-sm">
                                        <input
                                            type="radio"
                                            name="isCritical"
                                            className="w-4 h-4 accent-red-600"
                                            checked={formData.isCritical === val}
                                            onChange={() => set({ isCritical: val })}
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Additional note */}
                        <Field label="Additional Information (optional)">
                            <textarea
                                className="border border-neutral-300 dark:border-neutral-600 rounded-md outline-none px-3 py-2 text-sm min-h-[80px] max-h-[160px] resize-y focus:border-red-400 focus:ring-1 focus:ring-red-200 transition-colors"
                                placeholder="Any extra details that may help donors (e.g., surgery type, urgency notes)"
                                value={formData.note}
                                onChange={(e) => set({ note: e.target.value })}
                            />
                        </Field>
                    </div>

                    <button
                        type="submit"
                        disabled={isCreatingRecipient}
                        className="flex items-center justify-center gap-2 rounded-md bg-red-600 px-6 py-2.5 text-white font-medium text-sm hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                        {isCreatingRecipient ? (
                            <><Loader2 className="size-4 animate-spin" /> Submitting...</>
                        ) : (
                            <><Droplets className="size-4" /> Submit Blood Request</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default RequestMe
