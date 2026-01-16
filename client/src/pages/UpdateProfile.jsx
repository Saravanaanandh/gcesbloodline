import { Link } from "react-router" 
import { useRecipientStore } from "../store/useRecipientStore.jsx"
import Navbar from "../components/Navbar.jsx"
import { useAuthStore } from "../store/useAuthStore.jsx"
import { useEffect, useRef, useState } from "react"
import bannerImg from './../assets/banner.png'
import { Camera, DropletsIcon, Edit } from "lucide-react"
import profilePic from './../assets/user.png'
import ToggleButton from './../components/ToggleButton.jsx'
import editIcon from './../assets/editpng.png'
import toast from "react-hot-toast"
import { motion } from "framer-motion" 

const UpdateProfile = () => {  
    const {authUser, updateProfile, getUser} = useAuthStore()  

    useEffect(()=>{
        getUser()
    },[getUser])
    const [formData, setFormData] = useState({
        weight:authUser.weight,
        location:authUser.location,
        pinCode:authUser.pinCode,
        mobile:authUser.mobile,
        tattooIn12:authUser.tattooIn12,
        positiveHIVTest:authUser.positiveHIVTest
    }) 

    const bannerRef = useRef()
    const profileRef = useRef() 
    
    const [isMobileEdit, setisMobileEdit] = useState(false)
    const [isLocationEdit, setIsLocationEdit] = useState(false)
    const [isPincodeEdit, setIsPincodeEdit] = useState(false)
    const [isWeightEdit, setIsWeightEdit] = useState(false)

    const [banner, setBanner] = useState(null)
    const [profile, setProfile] = useState(null)  
    
    const handleImageChange = async (e)=>{
        const file = e.target.files[0] 
        if(!file) return;

        const reader = new FileReader() 
        reader.readAsDataURL(file)
        reader.onload = async ()=>{
            const base64Img = reader.result
            setBanner(base64Img)
            await updateProfile({banner:base64Img})
        } 
    }
    const handleProfileImageChange = async (e)=>{
        const file = e.target.files[0] 
        if(!file) return;

        const reader = new FileReader() 
        reader.readAsDataURL(file)
        reader.onload = async ()=>{
            const base64Img = reader.result
            setProfile(base64Img)
            await updateProfile({profile:base64Img})
        } 
    }
    
 
    const handleEditToggle = async(e)=>{
        const target = e.target 
        if(isMobileEdit){ 
            if(!target.classList.contains("Edit")){ 
                if(!/^\d{10}$/.test(formData.mobile.toString())){
                    setFormData({...formData,mobile:authUser.mobile})
                    return toast.error("Incorrect Mobile No")
                }
                await updateProfile({mobile:formData.mobile})
                setisMobileEdit(false)   
            }
        }  
        if(isLocationEdit){ 
            if(!target.classList.contains("Edit") ){ 
                await updateProfile({location:formData.location})
                setIsLocationEdit(false)   
            }
        }   
        if(isWeightEdit){ 
            if(!target.classList.contains("Edit")){ 
                if(!Number(formData.weight)) {
                    setFormData({...formData, weight:authUser.weight})
                    return toast.error("Invalid Weight")
                }
                await updateProfile({weight:formData.weight})
                setIsWeightEdit(false)   
            }
        }   
        if(isPincodeEdit){ 
            if(!target.classList.contains("Edit")){ 
                if(!/^\d{6}$/.test(formData.pinCode.toString())){
                    setFormData({...formData,pinCode:authUser.pinCode})
                    return toast.error("Incorrect Pincode")
                }
                await updateProfile({pinCode:formData.pinCode})
                setIsPincodeEdit(false)   
            }
        }   
        return;
    }  

    const subVarients2 = {
        hidden:{
            translateX:'100px'
        },
        visible:{
            translateX:0,
            transition:{
                type:'spring',
                delay:1,
                duration:1
            }
        },
    }
    const subVarients1 = {
        hidden:{
            translateX:'-100px'
        },
        visible:{
            translateX:0,
            transition:{
                type:'spring',
                delay:1,
                duration:1
            }
        },
    }
    const constVarients = {
        hidden:{
            translateY:'1000px'
        },
        visible:{
            translateY:0,
            transition:{
                type:'spring',
                delay:0.6,
                duration:1.4
            }
        },
    }
    return (
        <div className="min-h-[100vh]" onClick={handleEditToggle}>
            <Navbar/>
            <div className="relative rounded-lg w-full h-[25vh] sm:h-[40vh] bg-no-repeat bg-cover bg-center" style={{backgroundImage:`url(${banner || authUser.banner || bannerImg})`}}>
                <input 
                    type="file"
                    ref={bannerRef}
                    className="hidden"
                    accept="/image*"
                    onChange={handleImageChange}  
                />
                <div className="cursor-pointer absolute p-1 bg-gray-300 rounded-full bottom-2 right-2 hover:text-white transition-colors duration-300 ease-in-out" onClick={()=>bannerRef.current?.click()}>
                    <Edit className="text-black size-3 sm:size-5"/>
                </div>
            </div>
            <div className="sm:sticky top-22">
            <motion.div 
                className="relative"
                initial={{translateY:-1000,opacity:0.5}}
                animate={{translateY:0,opacity:1}}
                transition={{type:'spring', duration:0.5, delay:0.4,stiffness:70}}
            >
                <div className="absolute -top-10 sm:-top-20 left-5 sm:left-10 w-[80vw] sm:w-[25vw] h-auto sm:h-[50vh] rounded-md shadow-md bg-white dark:bg-black shadow-gray-500 p-5 flex flex-col max-sm:gap-5 sm:justify-between items-center">
                    <div className=" top-0 w-full flex justify-center">
                        <div className="cursor-pointer relative inline-block"> 
                            <input 
                                type="file" 
                                className="hidden"
                                ref={profileRef}
                                accept="/image*"
                                onChange={handleProfileImageChange}
                            />
                            <Camera onClick={()=> profileRef.current.click()} className="p-1 text-black size-5 sm:size-6 bg-gray-300 rounded-full absolute bottom-0 right-0 "/>
                            <img className="border-[1px] rounded-full size-23" src={profile || authUser.profile || profilePic} alt="profile picture" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <h1 className="sm:text-[1.2rem]"><strong>{authUser.username.toUpperCase()}</strong></h1>
                        <h1 className="text-wrap text-center">{authUser.email.slice(0,20) + ' ' + authUser.email.slice(20)}</h1>
                        <div className="w-full flex justify-center gap-1 sm:gap-3"> 
                            <span>Available:</span>
                            <ToggleButton 
                                Available={authUser?.available}
                            />
                        </div> 
                        <h1 className="flex gap-2 text-[1rem] sm:text-[1.2rem]">Donations : {authUser.donation}<span className="text-red-600 "><DropletsIcon className="size-5 sm:size-6"/></span></h1>
                    </div>
                    <div className="w-full flex flex-col gap-2"> 
                        <Link to='/alldonors'>
                            <button className="cursor-pointer w-full sm:py-1.5 py-1  rounded-md text-red-500 border-[1px] border-red-500"> 
                                Donors
                            </button>
                        </Link> 
                        <Link to='/allrequests' >
                            <button className="cursor-pointer w-full sm:py-1.5 py-1 bg-red-500 rounded-md text-white">
                                Recipients
                            </button>
                        </Link>
                    </div> 
                </div> 
            </motion.div> 
            </div>
            <div className=" w-full flex flex-col items-center justify-center sm:w-4/6  absolute max-sm:top-[85vh] right-[0vw] sm:right-0 mt-6 sm:px-5">
                <motion.h1 className="text-[2rem] text-center"  variants={constVarients}
                    initial="hidden"
                    animate="visible" ><strong>Profile</strong></motion.h1>
                <motion.ul 
                    className="flex flex-col gap-5 sm:w-3/4 my-10 leading-8 sm:leading-10"
                    variants={constVarients}
                    initial="hidden"
                    animate="visible" 
                >
                    <motion.li 
                        className="w-full flex justify-between border-b-[1px] border-b-black dark:border-white sm:sm:px-5"
                        variants={constVarients}
                    >
                        <motion.h3
                            variants={subVarients1}
                        >Age</motion.h3>
                        <motion.p
                            variants={subVarients2}
                        >
                           {authUser.age} 
                        </motion.p>
                    </motion.li>
                    <motion.li 
                        className="w-full flex justify-between border-b-[1px] border-b-black dark:border-white sm:sm:px-5"
                        variants={constVarients}
                    >
                        <motion.h3
                            variants={subVarients1}
                        >Blood Type</motion.h3>
                        <motion.p
                            variants={subVarients2}
                        >
                           {authUser.bloodType} 
                        </motion.p>
                    </motion.li>
                    <motion.li 
                        className="w-full flex justify-between border-b-[1px] border-b-black dark:border-white sm:sm:px-5"
                        variants={constVarients}
                    >
                        <motion.h3
                            variants={subVarients1}
                        >Lastly Donated Date :</motion.h3>
                        <motion.p
                            variants={subVarients2}
                        >
                           {authUser.lastDonated ? new Date(authUser.lastDonated).toISOString().split('T')[0] : "No donations!"} 
                        </motion.p>
                    </motion.li>
                    {
                    authUser.nextDonationDate ? (
                    <motion.li 
                        className="w-full flex justify-between border-b-[1px] border-b-black dark:border-white sm:sm:px-5"
                        variants={constVarients}
                    >
                        <motion.h3
                            variants={subVarients1}
                        >Suggest to Donate After(90days)</motion.h3>
                        <motion.p
                            variants={subVarients2}
                        >
                           {new Date(authUser.nextDonationDate).toISOString().split('T')[0]}
                        </motion.p>
                    </motion.li>
                        ) : ("")
                    } 
                    <motion.li 
                        className="w-full flex justify-between border-b-[1px] border-b-black dark:border-white sm:sm:px-5"
                        variants={constVarients}
                    >
                        <motion.h3
                            variants={subVarients1}
                        >Gender</motion.h3>
                        <motion.p
                            variants={subVarients2}
                        >
                           {authUser.gender} 
                        </motion.p>
                    </motion.li>
                    <motion.li 
                        className="w-full flex justify-between border-b-[1px] border-b-black dark:border-white sm:sm:px-5"
                        variants={constVarients}
                    >
                        <motion.h3
                            variants={subVarients1}
                        >Age</motion.h3>
                        <motion.p
                            variants={subVarients2}
                        >
                           {authUser.age} 
                        </motion.p>
                    </motion.li>
                     
                    <motion.li 
                        className="w-full flex items-center justify-between border-b-[1px] border-b-black dark:border-white sm:px-5"
                        variants={constVarients}
                    >
                        <motion.h3
                            variants={subVarients1}
                        >Location</motion.h3>
                        <motion.div className="flex items-center gap-3" variants={subVarients2}>
                            <div>
                                {
                                    isLocationEdit ? (
                                        <select
                                        className="bg-white text-black
        dark:bg-gray-900 dark:text-white Edit max-sm:w-20 border-[1px] rounded-md 
                                         
         "
                                        onChange={(e) =>
                                            setFormData({ ...formData, location: e.target.value })
                                        } 
                                        value={formData.location}
                                        > 
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
                                    ) : (
                                        <motion.p
                                            variants={subVarients2}
                                        >
                                        {formData.location} 
                                        </motion.p>
                                    )
                                }
                            </div> 
                            <button className="EditIcon size-4 cursor-pointer" onClick={()=> setIsLocationEdit(!isLocationEdit)}>
                              <Edit/>
                            </button>
                        </motion.div> 
                    </motion.li>
                    
                    <motion.li className="w-full flex items-center justify-between border-b-[1px] border-b-black dark:border-white sm:px-5" variants={constVarients}>
                        <motion.h3
                            variants={subVarients1}
                        >Pincode</motion.h3>
                        <motion.div className="flex items-center gap-3" variants={subVarients2}>
                            <div>
                                {
                                    isPincodeEdit ? ( 
                                            <input 
                                                className="Edit outline-none border-b-[1px] w-[10vw]"
                                                type="text" 
                                                placeholder={`${formData.pinCode ? '': "600012"}`}
                                                value={formData.pinCode || ""}
                                                autoFocus  
                                                onChange={e => setFormData({...formData, pinCode:e.target.value})}
                                            />  
                                    ) : (
                                        <motion.p
                                            variants={subVarients2}
                                        >
                                        {formData.pinCode} 
                                        </motion.p>
                                    )
                                }
                            </div> 
                            <button className="EditIcon size-4 cursor-pointer" onClick={()=> setIsPincodeEdit(!isPincodeEdit)}>
                              <Edit/>
                            </button>
                        </motion.div> 
                    </motion.li>
                    <motion.li 
                        className="w-full flex items-center justify-between border-b-[1px] border-b-black dark:border-white sm:px-5"
                        variants={constVarients}
                    >
                        <motion.h3
                            variants={subVarients1}
                        >Weights</motion.h3>
                        <motion.div className="flex items-center gap-3" variants={subVarients2}>
                            <div>
                                {
                                    isWeightEdit ? ( 
                                            <input 
                                                className="Edit outline-none border-b-[1px] w-[10vw]"
                                                placeholder={`${formData.weight ? '': "in Kgs"}`}
                                                type="text" 
                                                value={formData.weight || ""}
                                                autoFocus 
                                                onChange={(e)=>setFormData({...formData, weight:e.target.value})}
                                            /> 
                                    ) : (
                                        <motion.p
                                            variants={subVarients2}
                                        >
                                        {formData.weight} 
                                        </motion.p>
                                    )
                                }
                            </div> 
                            <button className="EditIcon size-4 cursor-pointer" onClick={()=> setIsWeightEdit(!isWeightEdit)}>
                              <Edit/>
                            </button>
                        </motion.div> 
                    </motion.li>
                    <motion.li 
                        className="w-full flex justify-between border-b-[1px] border-b-black dark:border-white sm:sm:px-5"
                        variants={constVarients}
                    >
                        <motion.h3
                            variants={subVarients1}
                        >Email</motion.h3>
                        <motion.p
                            variants={subVarients2}
                        >
                           {authUser.email} 
                        </motion.p>
                    </motion.li>
                     
                    <motion.li className="w-full flex items-center justify-between border-b-[1px] border-b-black dark:border-white sm:px-5" variants={constVarients}>
                    <motion.h3
                            variants={subVarients1}
                        >Mobile No</motion.h3>
                        <motion.div className="flex items-center gap-3" variants={subVarients2}>
                            <div>
                                {
                                    isMobileEdit ? (
                                        <input 
                                            className="Edit outline-none border-b-[1px] w-[10vw]"
                                            type="text" 
                                            placeholder={`${formData.mobile ? '': "+91 "}`}
                                            value={formData.mobile || ""}
                                            autoFocus 
                                            onChange={(e)=>setFormData({...formData, mobile:e.target.value})} 
                                        />
                                    ) : (
                                        <motion.p
                                            variants={subVarients2}
                                        >
                                        {formData.mobile} 
                                        </motion.p>
                                    )
                                }
                            </div> 
                            <button className="EditIcon size-4 cursor-pointer" onClick={()=> setisMobileEdit(!isMobileEdit)}>
                              <Edit/>
                            </button>
                        </motion.div> 
                    </motion.li>
                </motion.ul>
            </div>
        </div>
    )
} 
export default UpdateProfile