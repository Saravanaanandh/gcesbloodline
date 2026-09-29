import { useEffect, useRef, useState } from "react"
import { useRecipientStore } from "../store/useRecipientStore.jsx"
import toast from "react-hot-toast"
import Navbar from "../components/Navbar.jsx"
import { useNavigate } from "react-router"
import HospitalAutocomplete from "../components/HospitalAutocomplete.jsx"
import { AlertCircle, Droplets, Info, Loader2, MapPin } from "lucide-react"
import { resolveTamilNaduDistrict } from "../lib/tamilNaduDistricts.js"
import { MAX_BLOOD_UNITS, UNITS_HINT, validateBloodUnits } from "../lib/bloodUnits.js"
import { BLOOD_NEEDED_HINT, BLOOD_NEEDED_LABEL, todayIST, validateBloodNeededDate } from "../lib/bloodNeededDate.js"

const emptyForm = {
    bloodType:"",
    patientsName:"",
    patientsage:"",
    AttendeesName:"",
    AttendeesPhno:"",
    gender:"",
    email:"",
    location:"",
    place:"",
    pinCode:"",
    reqDate:"",
    bloodUnits:"",
    isCritical:true,
    hospitalInfo:"",
    note:""
}

const BLOOD_TYPES = ["A+","A-","B+","B-","O+","O-","AB+","AB-","A1+","A1-","A2+","A2-","A1B+","A1B-","A2B+","A2B-","Bombay Blood Group"]

const Field = ({ label, required, hint, error, children }) => (
    <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
        {hint && !error && (
            <span className="flex items-start gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                <Info className="size-3.5 shrink-0 mt-0.5" />{hint}
            </span>
        )}
        {error && (
            <span className="flex items-start gap-1 text-xs text-red-500">
                <AlertCircle className="size-3.5 shrink-0 mt-0.5" />{error}
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
const selectCls = inputCls + " cursor-pointer"

const Request = () => {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({ ...emptyForm, reqDate: todayIST() })
    const [lookup, setLookup] = useState({ loading: false, error: "", places: [] })
    const lookupId = useRef(0)
    const { createRecipient, isCreatingRecipient } = useRecipientStore()

    const set = (patch) => setFormData(prev => ({ ...prev, ...patch }))

    useEffect(() => {
        const pin = formData.pinCode
        const requestId = ++lookupId.current
        setFormData(prev => (prev.location || prev.place) ? { ...prev, location: "", place: "" } : prev)
        setLookup({ loading: false, error: "", places: [] })

        if (pin.length !== 6) return
        if (!/^[1-9][0-9]{5}$/.test(pin)) {
            setLookup({ loading: false, error: "Enter a valid 6-digit pincode", places: [] })
            return
        }

        const controller = new AbortController()
        setLookup({ loading: true, error: "", places: [] })
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: controller.signal })
                const data = await res.json()
                if (requestId !== lookupId.current) return
                const offices = data?.[0]?.Status === "Success" ? (data[0].PostOffice || []) : []
                if (!offices.length) {
                    setLookup({ loading: false, error: "No location found for this pincode", places: [] })
                    return
                }
                const tnOffices = offices.filter(o => o.State === "Tamil Nadu" && resolveTamilNaduDistrict(o.District))
                if (!tnOffices.length) {
                    setLookup({ loading: false, error: `${offices[0].District}, ${offices[0].State} is outside Tamil Nadu. GCES Blood Line does not serve this area yet.`, places: [] })
                    return
                }
                const district = resolveTamilNaduDistrict(tnOffices[0].District)
                const places = [...new Set(tnOffices.map(o => o.Name))]
                setLookup({ loading: false, error: "", places })
                setFormData(prev => prev.pinCode !== pin ? prev : { ...prev, location: district, place: places.length === 1 ? places[0] : "" })
            } catch (err) {
                if (err.name === "AbortError" || requestId !== lookupId.current) return
                setLookup({ loading: false, error: "Could not fetch location. Check your connection and try again.", places: [] })
            }
        }, 500)

        return () => { clearTimeout(timer); controller.abort() }
    }, [formData.pinCode])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.bloodType || !formData.patientsName || !formData.patientsage || !formData.AttendeesName || !formData.AttendeesPhno || !formData.gender || !formData.email || !formData.pinCode || !formData.reqDate || !formData.bloodUnits)
            return toast.error("Please fill all required fields")
        if (formData.patientsage > 100) return toast.error("Invalid age")
        if (formData.AttendeesPhno.toString().length !== 10) return toast.error("Mobile number must be 10 digits")
        if (formData.pinCode.toString().length !== 6) return toast.error("Pincode must be 6 digits")
        if (lookup.loading) return toast.error("Please wait, detecting the location...")
        if (lookup.error) return toast.error(lookup.error)
        if (!formData.location) return toast.error("Enter a valid Tamil Nadu pincode to detect the district")
        if (!formData.place) return toast.error("Please select the place")
        const dateError = validateBloodNeededDate(formData.reqDate)
        if (dateError) return toast.error(dateError)
        if (!formData.email.includes("@gmail.com")) return toast.error("Invalid email")
        const unitsError = validateBloodUnits(formData.bloodUnits)
        if (unitsError) return toast.error(unitsError)

        const created = await createRecipient({
            ...formData,
            hospitalInfo: formData.hospitalInfo ? formData.hospitalInfo.trim() : ""
        })
        if (!created) return
        setFormData(emptyForm)
        navigate('/alldonors')
    }

    return (
        <div className="min-h-screen">
            <Navbar />
            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* Page header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40">
                        <Droplets className="size-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">Request Blood for Someone</h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Fill in the patient and request details below</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    {/* Patient details */}
                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-5 flex flex-col gap-4">
                        <SectionHeader title="Patient Details" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Blood Group" required>
                                <select
                                    className={selectCls}
                                    value={formData.bloodType}
                                    onChange={(e) => set({ bloodType: e.target.value })}
                                    required
                                >
                                    <option value="">Select blood type</option>
                                    {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </Field>
                            <Field label="Gender" required>
                                <select
                                    className={selectCls}
                                    value={formData.gender}
                                    onChange={(e) => set({ gender: e.target.value })}
                                    required
                                >
                                    <option value="">Select gender</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                </select>
                            </Field>
                            <Field label="Patient's Name" required>
                                <input
                                    type="text"
                                    className={inputCls}
                                    placeholder="Full name of the patient"
                                    value={formData.patientsName}
                                    onChange={(e) => set({ patientsName: e.target.value })}
                                    required
                                />
                            </Field>
                            <Field label="Patient's Age" required>
                                <input
                                    type="number"
                                    className={inputCls}
                                    placeholder="Age in years"
                                    value={formData.patientsage || ""}
                                    onChange={(e) => set({ patientsage: parseInt(e.target.value) })}
                                    required
                                />
                            </Field>
                        </div>
                    </div>

                    {/* Contact details */}
                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-5 flex flex-col gap-4">
                        <SectionHeader title="Attendee & Contact" />
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
                            <Field label="Email (for donor notification)" required>
                                <input
                                    type="email"
                                    className={inputCls}
                                    placeholder="your@gmail.com"
                                    value={formData.email}
                                    onChange={(e) => set({ email: e.target.value })}
                                    required
                                />
                            </Field>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-5 flex flex-col gap-4">
                        <SectionHeader title="Location" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field
                                label="Pincode"
                                required
                                error={!lookup.loading && lookup.error ? lookup.error : ""}
                                hint={!lookup.loading && !lookup.error && formData.location ? "" : undefined}
                            >
                                <div className="relative">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        className={inputCls + " w-full pr-9"}
                                        placeholder="6-digit pincode"
                                        value={formData.pinCode}
                                        onChange={(e) => set({ pinCode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                                        required
                                    />
                                    {lookup.loading && (
                                        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 animate-spin text-red-500" />
                                    )}
                                </div>
                                {lookup.loading && (
                                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Detecting location...</span>
                                )}
                                {!lookup.loading && !lookup.error && formData.location && (
                                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                        <MapPin className="size-3.5 shrink-0" />
                                        Location detected automatically
                                    </span>
                                )}
                            </Field>
                            <Field label="District">
                                <input
                                    type="text"
                                    readOnly
                                    className={inputCls + " bg-neutral-50 dark:bg-neutral-800 cursor-not-allowed"}
                                    placeholder="Auto-detected from pincode"
                                    value={formData.location}
                                />
                            </Field>
                            <div className="sm:col-span-2">
                                <Field label="Place" required>
                                    {lookup.places.length > 1 ? (
                                        <>
                                            <select
                                                className={selectCls}
                                                value={formData.place}
                                                onChange={(e) => set({ place: e.target.value })}
                                                required
                                            >
                                                <option value="">Select the place ({lookup.places.length} found)</option>
                                                {lookup.places.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                                Multiple places share this pincode — select the right one.
                                            </span>
                                        </>
                                    ) : (
                                        <input
                                            type="text"
                                            readOnly
                                            className={inputCls + " bg-neutral-50 dark:bg-neutral-800 cursor-not-allowed"}
                                            placeholder="Auto-detected from pincode"
                                            value={formData.place}
                                        />
                                    )}
                                </Field>
                            </div>
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
                                {[{label:"Yes", val:true},{label:"No", val:false}].map(({label, val}) => (
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

export default Request
