import { useEffect, useState } from "react" 
import { useRecipientStore } from "../store/useRecipientStore.jsx"
import toast from "react-hot-toast"
import Navbar from "../components/Navbar.jsx"
import requestImg from './../assets/requestPageImg.png' 
import { useNavigate } from "react-router"
const Request = () => {
    
    const navigate = useNavigate()
    // const [isChecked, setIsChecked] = useState(true)
    const [formData, setFormData] = useState({
        bloodType:"",
        patientsName:"",
        patientsage:"",
        AttendeesName:"",
        AttendeesPhno:"",
        gender:"",
        email:"",
        location:"",
        pinCode:"",
        reqDate:new Date(Date.now()).toISOString().split('T')[0],
        bloodUnits:"",
        isCritical:true,
        note:""
    }) 
    const {createRecipient} = useRecipientStore()
    useEffect(()=>{
        console.log(formData)
    },[formData])
    const handleSubmit = async (e)=>{
        e.preventDefault()

        if(!formData.bloodType || !formData.patientsName || !formData.patientsage || !formData.AttendeesName || !formData.AttendeesPhno || !formData.gender || !formData.email || !formData.location || !formData.pinCode || !formData.reqDate || !formData.bloodUnits) return toast.error("please fill the required fields!, because it more helpful for donors")
        if(formData.patientsage > 100) return toast.error("Invalid Age")
        if(formData.AttendeesPhno.toString().length !== 10) return toast.error("Mobile Number Not Valid")
        if(formData.pinCode.toString().length !== 6) return toast.error("Pincode Not Valid")
        if(formData.reqDate < new Date(Date.now()).toISOString().split('T')[0]) return toast.error("Selected Date is Invalid")
        if(!formData.email.includes("@gmail.com")) return toast.error("Invalid Email")
        if (formData.bloodUnits > 10) {
            return toast.error(`Check! You require ${formData.bloodUnits} units of blood`);
        }
        try{
            await createRecipient(formData)
        }catch(err){
            console.log(err.message)
        }
        setFormData({
            bloodType:"",
            patientsName:"",
            patientsage:"",
            AttendeesName:"",
            AttendeesPhno:"",
            gender:"",
            email:"",
            location:"",
            pinCode:"",
            reqDate:"",
            bloodUnits:"",
            isCritical:isChecked,
            note:""
        }) 
        navigate('/alldonors')  
    }
  return (
    <div>
    <div className="min-h-[100vh]" > 
        <div className="relative">
            <img className="max-sm:hidden absolute -z-10 sm:right-20 sm:top-36 cover center w-[30vw] right-0 top-[24vh]" src={requestImg} alt="blood donation picture" />
        </div>
        <Navbar/>
        <h1 className="pl-10 text-[1.7rem] sm:text-[2rem] text-red-500"><strong>Request for Blood 🩸</strong></h1>
        <form onSubmit={handleSubmit} className="my-15 flex flex-col gap-10 px-10">
            <div className="w-full flex max-sm:flex-col gap-5 ">
            <div className="sm:w-1/4 flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                    <label>Blood Group:</label>
                    <select
                        onChange={(e)=> setFormData({...formData, bloodType:e.target.value})} 
                        className="border-[1px] dark:text-black border-black rounded-sm outline-none bg-white px-2 py-1"
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
                <div className="flex flex-col gap-1">
                    <label>Patient's Name:</label>
                    <input 
                        type="text" 
                        className="border-[1px] border-black dark:text-black rounded-sm outline-none bg-white px-2 py-1"
                        placeholder="patient's Name"
                        value={formData.patientsName}
                        onChange={(e)=> setFormData({...formData, patientsName:e.target.value})}
                        required
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label>Attendee's Name:</label> 
                    <input 
                        type="text" 
                        className="border-[1px] border-black dark:text-black rounded-sm outline-none bg-white px-2 py-1"
                        placeholder="Attendees's Name"
                        value={formData.AttendeesName}
                        onChange={(e)=> setFormData({...formData, AttendeesName:e.target.value})}
                        required
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <label>Patient's Gender:</label>
                    <select
                        className="border-[1px] border-black dark:text-black rounded-sm outline-none bg-white px-2 py-1"
                        onChange={(e)=> setFormData({...formData, gender:e.target.value})}  
                        required
                    >
                        <option>select Gender</option>
                        <option value={"MALE"}>Male</option>
                        <option value={"FEMALE"}>Female</option> 
                    </select>
                </div>
                <div className="max-sm:hidden flex flex-col gap-1">
                    <label>District:</label>
                    <select
                            onChange={(e)=> setFormData({...formData, location:e.target.value})} 
                            className="max-sm:hidden border-[1px] border-black dark:text-black rounded-md outline-none bg-white px-3 py-1.5"
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
                <div className="max-sm:hidden  flex flex-col gap-1">
                    <label>Email:</label>
                    <input 
                        type="email" 
                        className="max-sm:hidden border-[1px] border-black dark:text-black rounded-sm outline-none bg-white px-2 py-1"
                        placeholder="Enter email"
                        value={formData.email}
                        onChange={(e)=> setFormData({...formData, email:e.target.value})}
                        required
                    /> 
                </div> 
                <div className="max-sm:hidden">
                    <div className="mb-4 flex gap-5">
                    <label htmlFor="emergency" className="block mb-2 font-medium">
                        Is it Emergency?
                    </label>

                    <div className="flex gap-6 items-center" id="emergency">
                        {/* Yes option */}
                        <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            name="emergency"
                            value="yes"
                            className="w-[15px] h-[15px]"
                            checked={formData.isCritical === true}
                            onChange={() =>
                            setFormData({ ...formData, isCritical: true })
                            }
                        />
                        Yes
                        </label>

                        {/* No option */}
                        <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            name="emergency"
                            value="no"
                            className="w-[15px] h-[15px]"
                            checked={formData.isCritical === false}
                            onChange={() =>
                            setFormData({ ...formData, isCritical: false })
                            }
                        />
                        No
                        </label>
                    </div>
                </div>
                </div>  
                <div className="max-sm:hidden flex flex-col gap-1">
                    <label>Addition Information:</label>
                    <textarea
                        type="text" 
                        className="max-sm:hidden border-[2px]  min-h-[50px] max-h-[150px] outline-none rounded-sm"
                        placeholder="Additional note to potential donors"
                        value={formData.note}
                        onChange={(e)=> setFormData({...formData, note:e.target.value})}   
                        
                    >
                    </textarea>
                </div>
            </div>
            <div className="relative sm:w-1/4 flex flex-col gap-5 sm:mt-[52px]">
            <div className="flex flex-col gap-1">
                <label>Patient's Age:</label>
                <input 
                    type="tel" 
                    className="border-[1px] border-black dark:text-black rounded-sm outline-none bg-white px-2 py-1"
                    placeholder={`${formData.patientsage ? '': "Patients Age"}`}
                    value={formData.patientsage || ""} 
                    onChange={(e)=> setFormData({...formData, patientsage:parseInt(e.target.value)})}
                    required
                />
             </div>
            <div className="flex flex-col gap-1">
                <label>Attendee's Phone:</label>
                <input 
                    type="tel" 
                    className="border-[1px] border-black dark:text-black rounded-sm outline-none bg-white px-2 py-1"
                    placeholder={`${formData.AttendeesPhno ? '': "Attendee's Phone no"}`}
                    value={formData.AttendeesPhno || ""}
                    onChange={(e)=> setFormData({...formData, AttendeesPhno:parseInt(e.target.value)})}
                    required
                /> 
             </div> 
            <div className="flex flex-col gap-1">
                <label>Blood Required Date:</label>
                <input 
                    type="date" 
                    className="border-[1px] border-black dark:text-black rounded-sm outline-none bg-white px-2 py-1" 
                    value={formData.reqDate || ""} 
                    onChange={(e) => setFormData({...formData, reqDate:e.target.value})} required 
                />
             </div>
            <div className="sm:hidden flex flex-col gap-1">
                <label>District:</label>
                <select
                    onChange={(e)=> setFormData({...formData, location:e.target.value})} 
                    className="sm:hidden border-[1px] border-black dark:text-black rounded-md outline-none bg-white px-3 py-1.5"
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
            <div className="flex flex-col gap-1">
                <label>Pincode:</label>
                <input 
                    type="text"
                    className="border-[1px] border-black dark:text-black rounded-sm outline-none bg-white px-2 py-1"
                    placeholder={`${formData.pinCode ? '': "Enter pincode"}`}
                    value={formData.pinCode || ""}
                    onChange={(e)=> setFormData({...formData, pinCode:parseInt(e.target.value)})}
                    required
                />
             </div>
            <div className="sm:hidden  flex flex-col gap-1">
                <label>Email:</label>
                <input 
                    type="email" 
                    className="sm:hidden border-[1px] border-black dark:text-black rounded-sm outline-none bg-white px-2 py-1"
                    placeholder="Enter email"
                    value={formData.email}
                    onChange={(e)=> setFormData({...formData, email:e.target.value})}
                    required
                /> 
             </div>
            <div className="flex flex-col gap-1">
                <label>Required Blood Units:</label>
                <input 
                    type="tel" 
                    className="border-[1px] border-black dark:text-black rounded-sm outline-none bg-white px-2 py-1"
                    placeholder={`${formData.bloodUnits ? '': "No. of Units"}`}
                    value={formData.bloodUnits || ""} 
                    onChange={(e)=> setFormData({...formData, bloodUnits:parseInt(e.target.value)})}
                    required
                />
             </div> 
            <div className="sm:hidden flex flex-wrap gap-3">
                <label className="block mb-2">Is it Emergency?</label>

                    <div className="flex gap-4 items-center">
                    <label htmlFor="emergency-yes" className="flex items-center gap-1 cursor-pointer">
                        <input
                        name="emergency"
                        id="emergency-yes"
                        type="radio"
                        value="Yes"
                        className="w-[15px] h-[15px]"
                        checked={formData.isCritical === true}
                        onChange={() =>
                            setFormData({ ...formData, isCritical: true })
                        }
                        />
                        Yes
                    </label>

                    <label htmlFor="emergency-no" className="flex items-center gap-1 cursor-pointer">
                        <input
                        name="emergency"
                        id="emergency-no"
                        type="radio"
                        value="No"
                        className="w-[15px] h-[15px]"
                        checked={formData.isCritical === false}
                        onChange={() =>
                            setFormData({ ...formData, isCritical: false })
                        }
                        />
                        No
                    </label>
                    </div>
            </div>  
            <div className="sm:hidden flex flex-col gap-1">
                <label>Additional Information:</label>
                <textarea
                    type="text" 
                    className="sm:hidden border-[2px] min-h-[50px] max-h-[150px] outline-none rounded-sm"
                    placeholder="Additional note to potential donors"
                    value={formData.note}
                    onChange={(e)=> setFormData({...formData, note:e.target.value})} 
                >
                </textarea> 
            </div>
            <button className="sm:absolute bottom-0 -right-5 rounded-sm cursor-pointer bg-red-500 px-5 py-1 text-white" type="submit" onClick={handleSubmit}>
                Request for a Blood
            </button>
            </div>  
            </div>
        </form>
    </div>
    </div>
  )
}

export default Request