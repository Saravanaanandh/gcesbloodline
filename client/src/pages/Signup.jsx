import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore.jsx";
import signupImg from './../assets/Register.jpg';
import { Eye, EyeOff, Loader2, MapPin, AlertCircle } from "lucide-react";
import { resolveTamilNaduDistrict } from "../lib/tamilNaduDistricts.js";
import VerifyEmail from "../components/VerifyEmail.jsx";

const emptyForm = {
    username: "",
    age: "",
    gender: "",
    bloodType: "",
    location: "",
    place: "",
    pinCode: "",
    mobile: "",
    email: "",
    password: ""
};

const Signup = () => {

    // No `signup` any more: the account is created only after the emailed code is verified, so this
    // page has two steps. `signupTicket` is the pending signup on the server - while it is set the
    // verification step is what is on screen, and formData is left exactly as it was typed so
    // changing the email address or waiting for a resend never costs the user their answers.
    const { startSignup, signupTicket, isSignUp } = useAuthStore();
    const [formData, setFormData] = useState(emptyForm);
    const [isChecked, setIsChecked] = useState(false);
    const [showPassword, setShowPassword] = useState(false)
    const [lookup, setLookup] = useState({ loading: false, error: "", places: [] })
    const lookupId = useRef(0)

    useEffect(() => {
        const pin = formData.pinCode
        // Every pincode change invalidates any district/place resolved from the previous one.
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

                const tamilNaduOffices = offices.filter(office => office.State === "Tamil Nadu" && resolveTamilNaduDistrict(office.District))
                if (!tamilNaduOffices.length) {
                    setLookup({
                        loading: false,
                        error: `${offices[0].District}, ${offices[0].State} is outside Tamil Nadu. GCES Blood Line does not serve this area yet.`,
                        places: []
                    })
                    return
                }

                const district = resolveTamilNaduDistrict(tamilNaduOffices[0].District)
                const places = [...new Set(tamilNaduOffices.map(office => office.Name))]
                setLookup({ loading: false, error: "", places })
                setFormData(prev => prev.pinCode !== pin ? prev : {
                    ...prev,
                    location: district,
                    place: places.length === 1 ? places[0] : ""
                })
            } catch (err) {
                if (err.name === "AbortError" || requestId !== lookupId.current) return
                setLookup({ loading: false, error: "Could not fetch location. Check your connection and try again.", places: [] })
            }
        }, 500)

        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [formData.pinCode])

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.username || !formData.age || !formData.gender || !formData.bloodType || !formData.pinCode || !formData.mobile || !formData.email || !formData.password) {
            return toast.error("Please fill all the required fields!");
        }
        if(formData.age > 100 && formData.age <= 0) return toast.error("Invalid Age")
        if(formData.pinCode.toString().length !== 6) return toast.error("Enter valid pincode")
        if(lookup.loading) return toast.error("Please wait, detecting your location...")
        if(lookup.error) return toast.error(lookup.error)
        if(!formData.location) return toast.error("Enter a valid Tamil Nadu pincode to detect your district")
        if(!formData.place) return toast.error("Please select your place")
        if(formData.mobile.toString().length !== 10) return toast.error("Enter valid mobile number")
        if(!/^[a-zA-Z0-9._%+-]+@(gmail|outlook|gces)\.(com|edu\.in)$/.test(formData.email)) return toast.error("Enter valid Email")

        // startSignup reports its own failures and creates no account - it only sends the code.
        // formData is deliberately not cleared: the verification step needs to be able to fall back
        // to this form with everything still filled in.
        await startSignup(formData);
    };

    return ( 
        <div className="flex flex-col items-center justify-center w-full min-h-screen bg-no-repeat bg-fixed bg-cover bg-center py-12 px-4 sm:px-6 lg:px-8" style={{backgroundImage:`url(${signupImg})`}}>
            {signupTicket ? <VerifyEmail/> : (
            <div className="w-full max-w-4xl bg-white/95 dark:bg-gray-950/90 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-10 sm:p-14">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-3">Create Account</h1>
                        <p className="text-gray-600 dark:text-gray-400 text-lg">Join the GCES Blood Line community today.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            
                            <div className="flex flex-col">
                                <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Full Name</label>
                                <input 
                                    className="w-full p-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-gray-900 dark:text-gray-100 shadow-sm"
                                    type="text" 
                                    placeholder="Enter full name"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    autoComplete="on"
                                    required
                                />
                            </div>

                            <div className="flex flex-col">
                                <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Email Address</label>
                                <input 
                                    className="w-full p-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-gray-900 dark:text-gray-100 shadow-sm"
                                    type="email" 
                                    placeholder="Enter email address"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    autoComplete="on"
                                    required
                                />
                            </div>

                            <div className="flex flex-col">
                                <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Age</label>
                                <input 
                                    className="w-full p-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-gray-900 dark:text-gray-100 shadow-sm"
                                    type="number" 
                                    placeholder="Enter age"
                                    value={formData.age || ''}
                                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                                    autoComplete="on"
                                    required
                                    min="1"
                                    max="100"
                                />
                            </div>

                            <div className="flex flex-col">
                                <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Gender</label>
                                <select
                                    className="w-full p-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-gray-900 dark:text-gray-100 shadow-sm appearance-none"
                                    autoComplete="on"
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}  
                                    required
                                    value={formData.gender}
                                >
                                    <option value="">Select Gender</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option> 
                                </select>
                            </div>

                            <div className="flex flex-col">
                                <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Blood Group</label>
                                <select
                                    onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })} 
                                    value={formData.bloodType}
                                    className="w-full p-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-gray-900 dark:text-gray-100 shadow-sm appearance-none"
                                    autoComplete="on" 
                                    required
                                >
                                    <option value="">Select Blood Type</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                    <option value="A1+">A1+</option>
                                    <option value="A1-">A1-</option>
                                    <option value="A2+">A2+</option>
                                    <option value="A2-">A2-</option>
                                    <option value="A1B+">A1B+</option>
                                    <option value="A1B-">A1B-</option>
                                    <option value="A2B+">A2B+</option>
                                    <option value="A2B-">A2B-</option>
                                    <option value="Bombay Blood Group">Bombay Blood Group</option>
                                </select>
                            </div>

                            <div className="flex flex-col">
                                <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Mobile Number</label>
                                <input 
                                    className="w-full p-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-gray-900 dark:text-gray-100 shadow-sm"
                                    type="tel" 
                                    placeholder="10-digit mobile number"
                                    value={formData.mobile || ""} 
                                    onChange={(e) => setFormData({ ...formData, mobile: parseInt(e.target.value) })}
                                    autoComplete="on" 
                                    required
                                />
                            </div>

                            <div className="flex flex-col">
                                <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Pincode</label>
                                <div className="relative w-full">
                                    <input
                                        className="w-full p-3.5 pr-12 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-gray-900 dark:text-gray-100 shadow-sm"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="6-digit pincode"
                                        value={formData.pinCode}
                                        onChange={(e) => setFormData({ ...formData, pinCode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                                        autoComplete="postal-code"
                                        required
                                    />
                                    {lookup.loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 size-5 text-violet-600 animate-spin" />}
                                </div>
                                {lookup.loading && <span className="text-xs text-violet-600 dark:text-violet-400 mt-2 ml-1">Detecting your location...</span>}
                                {lookup.error && (
                                    <span className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400 mt-2 ml-1">
                                        <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                                        {lookup.error}
                                    </span>
                                )}
                                {!lookup.loading && !lookup.error && formData.location && (
                                    <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 mt-2 ml-1">
                                        <MapPin className="size-3.5 shrink-0" />
                                        Location detected automatically
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-col">
                                <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">District</label>
                                <input
                                    className="w-full p-3.5 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl outline-none text-gray-900 dark:text-gray-100 shadow-sm cursor-not-allowed"
                                    type="text"
                                    placeholder="Auto-filled from pincode"
                                    value={formData.location}
                                    readOnly
                                    required
                                />
                            </div>

                            <div className="flex flex-col md:col-span-2">
                                <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Place</label>
                                {lookup.places.length > 1 ? (
                                    <select
                                        className="w-full p-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-gray-900 dark:text-gray-100 shadow-sm appearance-none"
                                        value={formData.place}
                                        onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                                        required
                                    >
                                        <option value="">Select your place ({lookup.places.length} found)</option>
                                        {lookup.places.map(place => <option key={place} value={place}>{place}</option>)}
                                    </select>
                                ) : (
                                    <input
                                        className="w-full p-3.5 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl outline-none text-gray-900 dark:text-gray-100 shadow-sm cursor-not-allowed"
                                        type="text"
                                        placeholder="Auto-filled from pincode"
                                        value={formData.place}
                                        readOnly
                                        required
                                    />
                                )}
                                {lookup.places.length > 1 && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-1">Multiple places share this pincode. Please select yours.</span>
                                )}
                            </div>

                            <div className="flex flex-col md:col-span-2">
                                <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Password</label>
                                <div className="relative w-full">
                                    <input 
                                        className="w-full p-3.5 pr-12 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-gray-900 dark:text-gray-100 shadow-sm"
                                        type={showPassword ? "text":"password"}
                                        placeholder="Create a strong password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                                        required
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 hover:text-violet-600 transition-colors" onClick={()=>{setShowPassword(!showPassword)}}>
                                        {showPassword ? <Eye className="size-5"/> : <EyeOff className="size-5"/>}
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-1">Note: Please remember your password securely!</span>
                            </div>

                        </div>

                        <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-gray-200 dark:border-gray-800 pt-8">
                            <div className="flex items-center gap-3"> 
                                <input
                                    className="w-5 h-5 text-violet-600 bg-gray-100 border-gray-300 rounded focus:ring-violet-500 dark:focus:ring-violet-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                    type="checkbox" 
                                    id="terms"
                                    checked={isChecked}
                                    onChange={() => setIsChecked(!isChecked)}
                                /> 
                                <label htmlFor="terms" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                    I agree to the <a href="#" className="text-violet-600 dark:text-violet-400 hover:underline">Terms & Conditions</a>
                                </label>
                            </div>

                            <button
                                className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-10 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all duration-300 transform ${isChecked && !isSignUp ? 'bg-violet-600 hover:bg-violet-700 hover:shadow-violet-600/30 hover:-translate-y-1 cursor-pointer' : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-70'}`}
                                type="submit"
                                disabled={!isChecked || isSignUp}
                            >
                                {isSignUp
                                    ? <><Loader2 className="size-4 animate-spin"/> Sending Verification Code</>
                                    : 'Create Account'}
                            </button>
                        </div>
                        
                        <div className="text-center mt-2">
                            <p className="text-gray-600 dark:text-gray-400 font-medium">Already Registered? <Link className="text-violet-600 dark:text-violet-400 hover:underline ml-1 font-bold" to='/login'>Log in here</Link></p>
                        </div> 
                    </form>
                </div>
            </div>
            )}
        </div>
    );
};

export default Signup;
