import { useState } from "react" 
import toast from "react-hot-toast"
import { useDonorStore } from "../store/useDonorStore.jsx"
import donoteImg from './../assets/Donate_form_bg.jpg'
import Navbar from "../components/Navbar.jsx"
import { useNavigate } from "react-router"

const Donate = () => {
    const navigate = useNavigate() 
    const [formData, setFormData] = useState({ 
        donatePre:"no",
        lastSixmonthActivity:"no", 
    })
    const {createDonor} = useDonorStore()

    const handleSubmit = async (e)=>{
        e.preventDefault()

        if(!formData.lastSixmonthActivity ) return toast.error("please fill the required fields!, because it more helpful for recipients") 
        
        try{
            await createDonor(formData) 
        }catch(err){
            console.log(err.message)
        }
        setFormData({ 
            donatePre:"",
            lastSixmonthActivity:"", 
        })
        navigate('/allrequests')
    }
  return (
    <div className="relative"> 
        <div className="pb-10 flex flex-col dark:text-black items-center w-full min-h-[100vh] bg-no-repeat bg-fixed bg-cover bg-center" style={{backgroundImage:`url(${donoteImg})`}}>
            <Navbar/>
            <div className="text-start mb-5">
                <h1 className="sm:text-[2rem]"><strong>Blood Donation Consent Form</strong></h1> 
                <p>Your Donation is a Gift of Hop and Healing</p>
            </div>
            <form onSubmit={handleSubmit} className="sm:w-3/5 flex flex-col gap-3  p-5 backdrop:blur-sm border-[1px] border-black rounded-2xl shadow-sm shadow-black">
                 
                <div className="flex flex-col gap-1">
                    <label>Last Six Months Activity:</label>
                <select
                    className="border-[1px] cursor-pointer border-black rounded-md outline-none bg-white px-3 py-1.5"
                    onChange={(e)=> setFormData({...formData, lastSixmonthActivity:e.target.value})}  
                    required
                >  
                    <option value={"tattooing"}>Tattooing</option>
                    <option value={"piercing"}>Piercing</option> 
                    <option value={"dental extraction"}>Dental extraction</option> 
                    <option value={"affected by covid"}>Affected by Covid-19</option> 
                    <option value={"heavy feaver"}>Heavy Fever</option> 
                    <option value={"no"} selected>No</option> 
                </select> 
                </div>
                <div className="flex flex-col gap-1">
                    <label>Donate Previously:</label>
                <select
                    className="border-[1px] cursor-pointer border-black rounded-md outline-none bg-white px-3 py-1.5"
                    onChange={(e)=> setFormData({...formData, donatePre:e.target.value})}  
                    required
                > 
                    <option value={"yes"}>Yes</option>
                    <option value={"no"} selected>No</option>  
                </select> 
                </div>  
                <button 
                    type="submit" 
                    className="cursor-pointer bg-red-500 px-5 py-2 border-[1px] border-black rounded-md text-white hover:shadow-lg shadow-red-400 transition-all duration-300"
                    onClick={handleSubmit}
                >
                    Ready for Donate
                </button>
            </form> 
        </div>
    </div>
  )
}

export default Donate