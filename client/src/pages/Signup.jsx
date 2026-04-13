import { useState } from "react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore.jsx";
import signupImg from './../assets/Register.jpg';
import { Eye, EyeOff } from "lucide-react";

const Signup = () => {
    
    const { signup } = useAuthStore();
    const [formData, setFormData] = useState({
        username: "",
        age: "",
        gender: "",
        bloodType: "",
        location: "",
        pinCode: "", 
        mobile: "",
        email: "",
        password: ""
    });
    const [isChecked, setIsChecked] = useState(false);
    const [showPassword, setShowPassword] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.username || !formData.age || !formData.gender || !formData.bloodType || !formData.location || !formData.pinCode || !formData.mobile || !formData.email || !formData.password) {
            return toast.error("Please fill all the required fields!");
        }
        if(formData.age > 100 && formData.age <= 0) return toast.error("Invalid Age")
        if(formData.pinCode.toString().length !== 6) return toast.error("Enter valid pincode")
        if(formData.mobile.toString().length !== 10) return toast.error("Enter valid mobile number")
        if(!/^[a-zA-Z0-9._%+-]+@(gmail|outlook|gces)\.(com|edu\.in)$/.test(formData.email)) return toast.error("Enter valid Email")
        
        try {
            await signup(formData);
        } catch (err) {
            console.log(err.message);
            toast.error("Something went wrong, try again later " + err.message);
        } 
        setFormData({
            username: "",
            age: "",
            gender: "",
            bloodType: "",
            location: "",
            pinCode: "", 
            mobile: "",
            email: "",
            password: ""
        });
    };

    return ( 
        <div className="flex flex-col items-center justify-center w-full min-h-screen bg-no-repeat bg-fixed bg-cover bg-center py-12 px-4 sm:px-6 lg:px-8" style={{backgroundImage:`url(${signupImg})`}}> 
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
                                <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Location (District)</label>
                                <select
                                    className="w-full p-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-gray-900 dark:text-gray-100 shadow-sm appearance-none"
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    value={formData.location}
                                    autoComplete="on"
                                    required
                                >
                                    <option value="">Select District</option>
                                    <option value="Ariyalur">Ariyalur</option>
                                    <option value="Chengalpattu">Chengalpattu</option>
                                    <option value="Chennai">Chennai</option>
                                    <option value="Coimbatore">Coimbatore</option>
                                    <option value="Cuddalore">Cuddalore</option>
                                    <option value="Dharmapuri">Dharmapuri</option>
                                    <option value="Dindigul">Dindigul</option>
                                    <option value="Erode">Erode</option>
                                    <option value="Kallakurichi">Kallakurichi</option>
                                    <option value="Kanchipuram">Kanchipuram</option>
                                    <option value="Kanyakumari">Kanyakumari</option>
                                    <option value="Karur">Karur</option>
                                    <option value="Krishnagiri">Krishnagiri</option>
                                    <option value="Madurai">Madurai</option>
                                    <option value="Mayiladuthurai">Mayiladuthurai</option>
                                    <option value="Nagapattinam">Nagapattinam</option>
                                    <option value="Namakkal">Namakkal</option>
                                    <option value="Nilgiris">Nilgiris</option>
                                    <option value="Perambalur">Perambalur</option>
                                    <option value="Pudukkottai">Pudukkottai</option>
                                    <option value="Ramanathapuram">Ramanathapuram</option>
                                    <option value="Ranipet">Ranipet</option>
                                    <option value="Salem">Salem</option>
                                    <option value="Sivaganga">Sivaganga</option>
                                    <option value="Tenkasi">Tenkasi</option>
                                    <option value="Thanjavur">Thanjavur</option>
                                    <option value="Theni">Theni</option>
                                    <option value="Thoothukudi">Thoothukudi</option>
                                    <option value="Tiruchirappalli">Tiruchirappalli</option>
                                    <option value="Tirunelveli">Tirunelveli</option>
                                    <option value="Tirupathur">Tirupathur</option>
                                    <option value="Tiruppur">Tiruppur</option>
                                    <option value="Tiruvallur">Tiruvallur</option>
                                    <option value="Tiruvannamalai">Tiruvannamalai</option>
                                    <option value="Tiruvarur">Tiruvarur</option>
                                    <option value="Vellore">Vellore</option>
                                    <option value="Viluppuram">Viluppuram</option>
                                    <option value="Virudhunagar">Virudhunagar</option>
                                </select>
                            </div>

                            <div className="flex flex-col">
                                <label className="block mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Pincode</label>
                                <input 
                                    className="w-full p-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-gray-900 dark:text-gray-100 shadow-sm"
                                    type="number" 
                                    placeholder="6-digit pincode"
                                    value={formData.pinCode || ""}
                                    onChange={(e) => setFormData({ ...formData, pinCode: parseInt(e.target.value) })}
                                    autoComplete="on"
                                    required
                                />
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
                                className={`w-full md:w-auto px-10 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all duration-300 transform ${isChecked ? 'bg-violet-600 hover:bg-violet-700 hover:shadow-violet-600/30 hover:-translate-y-1 cursor-pointer' : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-70'}`} 
                                type="submit" 
                                disabled={!isChecked}
                            >
                                Create Account
                            </button>
                        </div>
                        
                        <div className="text-center mt-2">
                            <p className="text-gray-600 dark:text-gray-400 font-medium">Already Registered? <Link className="text-violet-600 dark:text-violet-400 hover:underline ml-1 font-bold" to='/login'>Log in here</Link></p>
                        </div> 
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Signup;
