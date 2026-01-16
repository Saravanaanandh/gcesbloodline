import { useEffect, useState } from "react" 
import { useRecipientStore } from "../store/useRecipientStore.jsx"
import toast from "react-hot-toast"
import Navbar from "../components/Navbar.jsx"
import requestImg from './../assets/requestPageImg.png' 
import { useNavigate } from "react-router"
import { useAuthStore } from "@/store/useAuthStore.jsx"
const RequestMe = () => {
    const navigate = useNavigate()
    const {authUser} = useAuthStore()
    const [isChecked, setIsChecked] = useState(true)
    const [formData, setFormData] = useState({
        bloodType:authUser.bloodType,
        patientsName:authUser.username,
        patientsage:authUser.age,
        AttendeesName:"",
        AttendeesPhno:"",
        gender:authUser.gender,
        email:authUser.email,
        location:authUser.location,
        pinCode:authUser.pinCode,
        reqDate:new Date(Date.now()).toISOString().split('T')[0],
        bloodUnits:"",
        isCritical:isChecked,
        note:""
    })
    useEffect(()=>{
        console.log(formData)
    },[formData])
    const {createRecipient} = useRecipientStore()

    const handleSubmit = async (e)=>{
        e.preventDefault()

        if( !formData.reqDate || !formData.bloodUnits || !formData.AttendeesName || !formData.AttendeesPhno ) return toast.error("please fill the required fields!, because it more helpful for donors") 
        if(formData.AttendeesPhno.toString().length !== 10) return toast.error("Mobile Number Not Valid") 
        if(formData.reqDate < new Date(Date.now()).toISOString().split('T')[0]) return toast.error("Selected Date is Invalid") 
        if (formData.bloodUnits > 10) {
            return toast.error(`Check! You require ${formData.bloodUnits} units of blood`);
        }
        try{
    await createRecipient(formData)
        }catch(err){
            console.log(err.message)
        }
        setFormData({ 
            AttendeesName:"",
            AttendeesPhno:"", 
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
        <h1 className="pl-10 text-[1.7rem] text-center sm:text-[2rem] text-red-500"><strong>Request for Blood 🩸</strong></h1>
        <form onSubmit={handleSubmit} className="my-15 flex flex-col gap-10 px-10"> 
            <div className="w-full flex justify-center items-center flex-col gap-5"> 
                <div className="sm:w-1/4 w-3/4  flex flex-col gap-1">
                    <label>Attendee's Name:</label> 
                    <input 
                        type="text" 
                        className="border-[1px] dark:text-black border-black rounded-sm outline-none bg-white px-2 py-1"
                        placeholder="Attendees's Name"
                        value={formData.AttendeesName}
                        onChange={(e)=> setFormData({...formData, AttendeesName:e.target.value})}
                        required
                    />
                </div>
                <div className="sm:w-1/4 w-3/4  flex flex-col gap-1">
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
                <div className="sm:w-1/4 w-3/4  flex flex-col gap-1">
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
              <div className="sm:w-1/4 w-3/4 flex flex-wrap gap-3 dark:text-white">
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
              <div className="sm:w-1/4 w-3/4  flex flex-col gap-1">
                  <label>Addition Information:</label>
                  <textarea
                      type="text" 
                      className="border-[2px]  min-h-[50px] max-h-[150px] outline-none rounded-sm"
                      placeholder="Additional note to potential donors"
                      value={formData.note}
                      onChange={(e)=> setFormData({...formData, note:e.target.value})}  
                      
                  >
                  </textarea>
              </div>
                
              <button className="sm:w-1/4 w-3/4  rounded-sm cursor-pointer bg-red-500 px-5 py-1 text-white" type="submit" onClick={handleSubmit}>
                  Request for a Blood
              </button>
            </div> 
        </form>
    </div>
    </div>
  )
}

export default RequestMe