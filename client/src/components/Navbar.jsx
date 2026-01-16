import { useAuthStore } from "../store/useAuthStore.jsx"
import { Link, useParams} from "react-router"
import {ArrowBigRightDashIcon, CircleAlert, Home, LogOut, Mail, MoonStar, SunIcon, User} from 'lucide-react'
import logo from './../assets/logo.png'
import {motion} from 'framer-motion' 
import { useTheme } from "next-themes"
const Navbar = () => {
    
    const {theme, setTheme} = useTheme()
    const {authUser,logout} = useAuthStore()
    const handleProfileClick = async()=>{
        console.log(authUser)
    }
    const {id:userId} = useParams()

    const isReqFormPage = location.pathname === '/request'
    const isProfilePage =  location.pathname === '/profile' 
    const isAll = location.pathname === '/alldonors' || location.pathname === `/allrequests`
    const isSingle = location.pathname === `/alldonors/${userId}` || location.pathname === `/allrequests/${userId}`
  return (
    <motion.div 
        className={`relative w-full flex justify-between items-center ${isProfilePage || isAll || isSingle ? 'p-4' : 'p-5 sm:p-10'}`}
        initial={{translateY: '-100px',opacity:0}}
        animate={{translateY:0,opacity:1}}
        transition={{type:'spring',duration:1.2, delay:0.4}}
    >
        <Link to='/'>
            <div className="text-[0.9rem] sm:text-[1.2rem] cursor-pointer">
                <h1 className="flex items-center"><img className="mr-3 w-6 sm:w-10 inline-block drop-shadow-lg"   src={logo} alt="" /> <strong className="">GCES <span className={authUser ? "text-red-500":"text-blue-400"}>BLOOD LINE</span></strong></h1>
            </div>
        </Link>
        <div className="flex items-center gap-3"> 
            <button
                className="rounded-full border-[3px] text-black dark:text-white p-1  hover:border-black dark:hover:border-white"
                title={`${theme === 'light'? 'Light Mode':'Dark Mode'}`}
                onClick={()=> setTheme(theme === 'light'? 'dark':'light')}
            >
                {theme === 'light'? <SunIcon/> :<MoonStar/>}
            </button>
            <Link to={`${location.pathname === '/' ? '/learnmore':"/"}`}>
                <button title={`${location.pathname === '/' ? 'learnmore':"Home"}`} className="flex items-center cursor-pointer text-nowrap rounded-full px-1 py-1 text-black dark:text-white transition-all duration-300 hover:scale-105 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black" > 
                    {location.pathname === '/' ?  (<CircleAlert className="size-6"/>) :( <Home className="size-5"/>)} 
                </button>  
            </Link> 
            {
                
                !isProfilePage && ( 
                        <Link title="profile" className="bg-red-600 text-white rounded-full px-1 py-1 sm:px-2 sm:py-2 transition-all duration-200 hover:scale-105" to='/profile'> 
                            <span className="cursor-pointer  flex gap-1" onClick={handleProfileClick}>
                                <User/> 
                            </span>
                        </Link>  
                )
            } 
            {
                isReqFormPage && (
                    <Link to='/allrequests'>
                        <button className="ml-1 sm:ml-5 bg-red-500 rounded-md text-white px-1.5 py-1 sm:px-3 sm:py-2 transition-all duration-200 hover:scale-105" onClick={handleProfileClick}>
                            <Link className="flex gap-1" to='/allrequests'> <Mail/><span className="max-sm:hidden"> My Request</span></Link>
                        </button>
                    </Link>
                )
            }
            {
                isProfilePage && (
                    <Link to='/login'>
                        <button className="bg-red-500 rounded-md text-white px-1.5 py-1 sm:px-3 sm:py-2 transition-all duration-200 hover:scale-105" onClick={logout}>
                            <div className="flex items-center gap-1 ">logout <LogOut className="size-4 sm:size-6"/></div>
                        </button>
                    </Link>
                )
            }
            
        </div>
    </motion.div>
  )
}

export default Navbar