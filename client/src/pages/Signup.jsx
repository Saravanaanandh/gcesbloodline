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
        <div className="pb-10 flex flex-col items-center w-full min-h-[100vh] bg-no-repeat bg-fixed bg-cover bg-center" style={{backgroundImage:`url(${signupImg})`}}> 
        <form onSubmit={handleSubmit} className="flex items-center justify-center my-10 max-sm:my-4">
            
            <div className="flex flex-col gap-1 min-h-auto w-[85vw] px-10 sm:w-[40vw] bg-amber-50 py-10 rounded-2xl max-sm:py-5 dark:text-black">
                <h1 className="sm:text-[2rem] text-center"><strong>Create Account</strong></h1>

                <label className="text-start w-full">Full Name</label>
                <input 
                    className=" bg-gray-300 sm:w-[30vw] w-[100%] outline-none border-none p-2 rounded-md"
                    type="text" 
                    placeholder="Enter fullname"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    autoComplete="on"
                    required
                />

                <label>Age</label>
                <input 
                    className="bg-gray-300 sm:w-[30vw] w-[100%] outline-none border-none p-2 rounded-md"
                    type="tel" 
                    placeholder="Enter Age"
                    value={formData.age || ''}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                    autoComplete="on"
                    required
                />

                <label>Blood Group</label>
                <select
                    onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })} 
                    className="bg-gray-300 sm:w-[30vw] w-[100%] outline-none border-none p-2 rounded-md"
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


                <label>Gender</label>
                <select
                    className="bg-gray-300 sm:w-[30vw] w-[100%] outline-none border-none p-2 rounded-md"
                    autoComplete="on"
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}  
                    required
                >
                    <option value="">Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option> 
                </select>

                <label>Location</label>
                <select
                    className=" bg-gray-300 sm:w-[30vw] w-[100%] outline-none border-none p-2 rounded-md"
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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


                <label>Pincode</label>
                <input 
                    className="bg-gray-300 sm:w-[30vw] w-[100%] outline-none border-none p-2 rounded-md"
                    type="tel" 
                    placeholder="Enter Pincode"
                    value={formData.pinCode || ""}
                    onChange={(e) => setFormData({ ...formData, pinCode: parseInt(e.target.value) })}
                    autoComplete="on"
                    required
                />

                <label>Mobile Number</label>
                <input 
                    className="bg-gray-300 sm:w-[30vw] w-[100%] outline-none border-none p-2 rounded-md"
                    type="tel" 
                    placeholder="Enter Mobile No."
                    value={formData.mobile || ""} 
                    onChange={(e) => setFormData({ ...formData, mobile: parseInt(e.target.value) })}
                    autoComplete="on" 
                    required
                />

                <label>Email</label>
                <input 
                    className="bg-gray-300 sm:w-[30vw] w-[100%] outline-none border-none p-2 rounded-md"
                    type="email" 
                    placeholder="Enter Email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    autoComplete="on"
                    required
                />

                <label>Password</label>
                <div className="relative flex justify-between items-center sm:w-[30vw] w-[100%]">

                <input 
                    className="bg-gray-300 sm:w-[30vw] w-full outline-none border-none p-2 rounded-md"
                    type={showPassword ? "text":"password"}
                    placeholder="Enter Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                    required
                />
                <div className="absolute right-3 cursor-pointer" onClick={()=>{setShowPassword(!showPassword)}}>
                  {
                    showPassword ? 
                      <Eye className="size-4"/> : <EyeOff className="size-4"/>
                  }
                  </div>
                </div>
                <div>Note: Remember Your password!</div>
                <div className="text-center my-1"> 
                    <input
                        className=" bg-gray-300 mr-2 outline-none border-none p-2 rounded-md"
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => setIsChecked(!isChecked)}
                    /> 
                    <span>I agree with <a href="#">Terms & Conditions</a></span>
                </div>

                <div className="sm:w-[30vw] w-[100%] text-center">
                    <button className="w-full text-nowrap border-[1px] border-violet-800 rounded-md px-2 py-1 sm:px-5 sm:py-2.5 bg-violet-900 text-white transition-all duration-300 hover:scale-105" type="submit" onClick={handleSubmit} disabled={!isChecked}>
                        Create Account
                    </button>
                    <div className="mt-2">
                        <p>Already Registered? <Link className="underline text-violet-800" to='/login'>Login</Link></p>
                    </div> 
                </div>
            </div>
        </form>
      </div>
    );
};

export default Signup;
