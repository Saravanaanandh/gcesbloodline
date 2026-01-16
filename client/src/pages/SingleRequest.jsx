 
import Navbar from "../components/Navbar.jsx" 
import { useEffect,useState} from "react"
import bannerImg from './../assets/banner.png'
import { AlertTriangleIcon, CheckCheck, CheckCircle, CircleAlert, Clock, DropletsIcon, Smartphone, X} from "lucide-react"
import profilePic from './../assets/user.png'
import ToggleButton from './../components/ToggleButton.jsx'  
import { useParams } from "react-router" 
import { useRecipientStore} from '../store/useRecipientStore.jsx'  
import { useNavigate } from "react-router"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog.jsx"
import { useAuthStore } from "@/store/useAuthStore.jsx"

const SingleRequest = () => { 

    const [showToggle, setShowToggle] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowToggle(true);  // Enable rendering after delay
        }, 500);

        return () => clearTimeout(timer); // Cleanup on unmount
    }, []);
    const navigate = useNavigate()
    const {id:recipientId} = useParams()  
    const {recipient,acceptRequest, rejectRequest,getRecipient,confirmedRequest,rejectAcceptedRequest} = useRecipientStore()
    const {isUserAsDonor} = useAuthStore()
    useEffect(()=>{
      getRecipient(recipientId)
    },[recipientId]) 
    
    return (
        <div className="min-h-[100vh]">
            <Navbar/>
            <div className="relative rounded-lg w-full h-[25vh] sm:h-[40vh] bg-no-repeat bg-cover bg-center" style={{backgroundImage:`url(${ recipient.recipientProfile?.banner || bannerImg})`}}> 
            </div>
            <div className="sm:sticky top-22">
            <div className="relative">
                <div className="absolute -top-10 sm:-top-20 left-5 sm:left-10 w-[80vw] sm:w-[25vw] max-sm:gap-5 h-auto rounded-md shadow-md bg-white dark:bg-black shadow-gray-500 p-5 flex flex-col items-center">
                    <div className=" top-0 w-full flex justify-center">
                        <div className=" cursor-pointer relative inline-block"> 
                            <img className=" border-[1px] rounded-full size-23" src={  recipient.recipientProfile?.profile || profilePic} alt="profile picture" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <h1 className="text-[1.2rem]"><strong>{ recipient.recipientProfile?.username.toUpperCase()}</strong></h1>
                        <h1 className="">{recipient.recipientProfile?.email}</h1>
                        {/* <div className="flex gap-3"> 
                            <span> Available : </span>
                            {
                                !showToggle && (
                                    <ToggleButton 
                                        Available={recipient.recipientProfile?.available}
                                        Id={recipient.recipientDetail?._id}
                                    /> 
                                )
                            }
                            {
                                showToggle && (
                                    <ToggleButton 
                                        Available={recipient.recipientProfile?.available}
                                        Id={recipient.recipientDetail?._id}
                                    /> 
                                )
                            }
                        </div>  */}
                        <h1 className="flex gap-2 text-[1.2rem]">Donations : { recipient.recipientProfile?.donation}<span className="text-red-600 "><DropletsIcon/></span></h1>
                    </div>
                </div> 
            </div> 
            </div>
            <div className="w-full flex flex-col items-center justify-center sm:w-4/6 absolute max-sm:top-[70vh] right-0 mt-6 sm:sm:px-5">
                <h1 className="text-[2rem] text-center"><strong>Patients Details</strong></h1>
                <h1>{recipient.recipientDetail?.isCritical ? 
                    recipient.request?.status !== "finalState" && (
                    <div className="p-1 px-2 mt-2 bg-red-600 text-white rounded-sm flex gap-2 items-center animate-caret-blink">
                        <strong>Emergency </strong> <AlertTriangleIcon/>
                    </div>) 
                :""}</h1>
                <ul className="flex flex-col gap-4 w-3/4 my-10">
                
                    <li className="w-full flex justify-between border-b-[1px] border-b-black dark:border-white pb-2 sm:px-5">
                        <h3>Patient's Name</h3>
                        <p className="text-end">
                           { recipient.recipientDetail?.patientsName} 
                        </p>
                    </li>
                    <li className="w-full flex justify-between border-b-[1px] border-b-black dark:border-white pb-2 sm:px-5">
                        <h3>Patient's Age</h3>
                        <p>
                           { recipient.recipientDetail?.patientsage} 
                        </p>
                    </li>
                    <li className="w-full flex justify-between border-b-[1px] border-b-black dark:border-white pb-2 sm:px-5">
                        <h3>Gender</h3>
                        <p>
                           {recipient.recipientDetail?.gender} 
                        </p>
                    </li>
                    
                    <li className="w-full flex justify-between border-b-[1px] border-b-black dark:border-white pb-2 sm:px-5">
                        <h3>Requested Blood</h3>
                        <p>
                           {recipient.recipientDetail?.bloodType} 
                        </p>
                    </li>
                    <li className="w-full flex justify-between border-b-[1px] border-b-black dark:border-white pb-2 sm:px-5">
                        <h3>Required Blood Units </h3>
                        <p>
                           {recipient.recipientDetail?.bloodUnits} 
                        </p>
                    </li>
                    <li className="w-full flex items-center justify-between border-b-[1px] border-b-black dark:border-white pb-2 sm:px-5">
                        <h3>Attendees Name</h3> 
                        <p className="text-end">
                          {recipient.recipientDetail?.AttendeesName} 
                        </p>
                    </li>
                    <li className="w-full flex items-center justify-between border-b-[1px] border-b-black dark:border-white pb-2 sm:px-5">
                        <h3>Attendees Mobile Number</h3> 
                        <p>
                          {isUserAsDonor ? recipient.recipientDetail?.AttendeesPhno:`+91 *******${recipient.recipientDetail?.AttendeesPhno.toString().slice(7)}`} 
                        </p>
                    </li>
                    <li className="w-full flex justify-between border-b-[1px] border-b-black dark:border-white pb-2 sm:px-5">
                        <h3>Email</h3>
                        <p className="text-wrap text-end">
                           {isUserAsDonor ? recipient.recipientDetail?.email: `${recipient.recipientDetail?.email.charAt(0)}******@gmail.com`} 
                        </p>
                    </li> 
                    {/* <li className="w-full flex justify-between border-b-[1px] border-b-black dark:border-white pb-2 sm:px-5">
                        <h3>Person Last Donated Date :</h3>
                        <p>
                           {recipient.recipientProfile?.lastDonated || "No donations!"} 
                        </p>
                    </li> */}
                    {/* {
                        recipient.recipientProfile?.nextDonationDate ? (
                            <li className="w-full flex justify-between border-b-[1px] border-b-black dark:border-white pb-2 sm:px-5">
                                <h3>Suggest to Donate After (90days) </h3>
                                <p>
                                {recipient.recipientProfile?.nextDonationDate} 
                                </p>
                            </li>
                        ) : ("")
                    }  */}
                    <li className="w-full flex items-center justify-between border-b-[1px] border-b-black dark:border-white pb-2 sm:px-5">
                        <h3>Location</h3>
                        <p>
                           {recipient.recipientDetail?.location} 
                        </p>
                    </li>
                    <li className="w-full flex items-center justify-between border-b-[1px] border-b-black dark:border-white pb-2 sm:px-5">
                        <h3>PinCode</h3> 
                        <p>
                           {recipient.recipientDetail?.pinCode} 
                        </p>
                    </li>
                    
                </ul>
                <div className="mb-10">
                    {
                        recipient.request?.status === "prepending" ? (
                        <div className="mb-10 flex gap-5">
                            <button 
                                className="cursor-pointer" 
                                onClick={()=>{
                                    
                                    rejectRequest(recipient.request?._id);
                                    navigate('/allrequests')
                                }}
                            > 
                            <div className="px-4 py-2 rounded-sm text-red-600 border-[1px] flex gap-2 transition-all duration-300 hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-md hover:shadow-red-800">
                                Reject <X/>
                            </div> 
                            </button>
                            <button 
                                className="cursor-pointer" 
                                onClick={()=>{
                                    acceptRequest(recipient.request?._id);
                                    navigate('/allrequests')
                                }}
                            >  
                                <div className="px-4 py-2 rounded-sm text-green-600 border-[1px] flex gap-2 transition-all duration-300 hover:bg-green-600 hover:text-white hover:border-green-600 hover:shadow-md hover:shadow-green-800">
                                    Accept <CheckCheck/>
                                </div>
                            </button>
                        </div>
                        ) :  recipient.request?.status === "accepted" ? (
                            <span  className="px-4 py-2 rounded-sm flex gap-2  bg-yellow-600 text-white border-yellow-600 shadow-md shadow-yellow-800">Waiting <Clock/></span>
                        ) : recipient.request?.status === "pending" ?  (
                            <div className="mb-10 flex gap-5">
                                <button 
                                    className="cursor-pointer" 
                                    onClick={()=>{
                                        rejectAcceptedRequest(recipient.request?._id);
                                        navigate('/allrequests')
                                    }}
                                > 
                                <div className="px-4 py-2 rounded-sm text-red-600 border-[1px] flex gap-2 transition-all duration-300 hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow-md hover:shadow-red-800">
                                    cancel <X/>
                                </div> 
                                </button>
                                <button 
                                    className="cursor-pointer" 
                                    onClick={()=>{
                                        confirmedRequest(recipient.request?._id); 
                                        navigate('/allrequests') 
                                    }}
                                >  
                                    <div className="px-4 py-2 rounded-sm text-green-600 border-[1px] flex gap-2 transition-all duration-300 hover:bg-green-600 hover:text-white hover:border-green-600 hover:shadow-md hover:shadow-green-800">
                                        Confirm <CheckCheck/>
                                    </div>
                                </button>
                            </div>
                        ) : recipient.request?.status === "confirmed" ?  (
                            <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <span 
                                            className="cursor-pointer flex items-center gap-1 px-3 py-2 rounded-sm  bg-green-700 text-white shadow-md shadow-green-800"
                                        >
                                            Generate OTP <Smartphone/>
                                        </span>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle> 
                                            <h1 className="flex items-center justify-center gap-2"><CircleAlert/>Info</h1> <br />
                                            <p>
                                                After you are matched with a genuine recipient, both you and the recipient will confirm the details. You then visit the recipient’s location to donate blood. Once the donation is completed, you need to generate an OTP by clicking on the Generate OTP option. The OTP will be sent to the recipient’s registered Gmail. The recipient will share the OTP with you for verification, and once confirmed, your donation process is successfully completed.
                                            </p>
                                            <h3>
                                                Have you found a donor and successfully completed the donation? 
                                            </h3>
                                        </AlertDialogTitle> 
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel className="border-[1px] border-red-500 text-red-500 hover:text-red-500">No</AlertDialogCancel>
                                        <AlertDialogAction  onClick={()=>navigate(`/${recipient.request?._id}/otp`)} className="bg-red-600 text-white hover:bg-red-500 ">yes</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            
                        ) : recipient.request?.status === "finalState" ? ( 
                            <span  className="px-4 py-2 rounded-sm flex gap-2  bg-green-600 text-white border-green-600 shadow-md shadow-green-800">
                                Completed <CheckCircle/>
                            </span>  
                        ) : "" 
                    } 
                </div>
            </div>
        </div>
    )
} 
export default SingleRequest