import { useAuthStore } from "../store/useAuthStore.jsx"
import { Link } from "react-router"
import homepage from './../assets/landImage.png'
import homepageImg from './../assets/anime.png' 
import Navbar from "../components/Navbar.jsx"
import logo from './../assets/logo1.png' 
import styled, { keyframes } from "styled-components"
import { motion } from "framer-motion"
import blood from './../assets/drop.png'
import blood2 from './../assets/hand.png' 
import { useRef } from "react"
import { useNavigate } from "react-router" 
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog" 
import AnimatedButton from "@/components/AnimatedButton.jsx"

const rotate = keyframes`
    from{
        --angle:0deg
    }
    to{
        --angle:360deg
    }
`

const Button = styled.div`
    
    position: relative; 
    max-width: 300px;
    max-height: 400px;   
    @property --angle{
        syntax: "<angle>";
        initial-value: 0deg;
        inherits: false;
    }
    &::before,
    &::after{
        content: ''; 
        position: absolute;
        inset: -4px;
        border-radius: 7px;
        background: conic-gradient(from var(--angle),red, white 30%,red); 
        z-index: -1;
        animation: ${rotate} 3.5s infinite linear;
    }
    &::before{
        filter: blur(8px);
        animation: ${rotate} 2.5s infinite linear;
    }  
    &:hover{
        font-size: 1.2rem; 
    } 
    @media screen and (max-width: 350px){
        &:hover{
            font-size: 0.8rem; 
        } 
        &::before,
        &::after{
            inset:-2px;
        }
    }
` 

const Home = () => { 

    const navigate = useNavigate(); 
    const reqRef = useRef()
    const handleClick = (e,to) => {  
        e.preventDefault() 
        navigate(to); 
    };
    
    const {authUser} = useAuthStore()
    return ( 
        <div className="h-dvh w-screen overflow-hidden" >
            <div className="max-sm:max-w-[90vw] w-full" >{
                authUser ? (
                    <motion.div 
                        className="relative"
                        initial={{opacity:0, translateX: 1000}}
                        animate={{opacity:1,translateX: 0}}
                        transition={{type:'tween',duration:1,delay:0.2}}
                    >    
                        <img className="absolute   -z-10 sm:right-20 sm:top-36 cover center w-[30vw] max-sm:w-[50vw] right-0 top-[34vh]" src={homepageImg} alt="blood donation picture" />
                    </motion.div>
                ) : (
                    <motion.div 
                        className="relative"
                        initial={{translateX:'200vw',scale:0,opacity:0}}
                        animate={{translateX:0,scale:1,opacity:1}}
                        transition={{type:'tween',duration:1.4,delay:0.6}}
                    >
                        <img className="absolute -z-10 sm:right-20 sm:top-36 cover center max-sm:w-[70vw] right-0 top-[34vh]" src={homepage} alt="blood donation picture" />
                    </motion.div>
                )
            }</div>
            { authUser && <Navbar/>}
            <div className="w-full flex items-center px-5 pt-5 sm:pl-10 pl-5"> 
                <div className="w-full p-2 sm:p-3"> 
                {
                    !authUser && (
                        <motion.div 
                            className="flex items-center justify-between gap-3 sm:gap-8"
                            initial={{translateY: '-100px',opacity:0}}
                            animate={{translateY:0,opacity:1}}
                            transition={{type:'tween',duration:1.2, delay:0.2}}
                        >
                            <Link to='/'>
                                <div className="text-sm sm:text-[1.2rem] cursor-pointer">
                                    <h1 className="flex items-center"><img className="sm:mr-3 w-10 inline-block brightness-150" src={logo} alt="" />  <strong>GCES <span className={authUser ? "text-red-500":"text-blue-400"}>BLOOD LINE</span></strong></h1>
                                </div>
                            </Link>
                            <div className="sm:text-[1.2rem] flex gap-5"> 
                                <Link to='/login' className="inline-block">
                                    <button className="cursor-pointer text-nowrap border-[1px] border-violet-800 dark:text-white rounded-md px-2 py-1 sm:px-6 sm:py-3  text-violet-900 transition-all duration-300 hover:scale-105" > 
                                        Log In
                                    </button>  
                                </Link>
                                <Link to='/signup'  className=" inline-block">
                                    <button className="cursor-pointer text-nowrap border-[1px] border-violet-800 rounded-md px-2 py-1 sm:px-5 sm:py-3 bg-violet-900 text-white transition-all duration-300 hover:scale-105" > 
                                        Sign Up
                                    </button>  
                                </Link>
                            </div> 
                        </motion.div>
                    )
                }
                {
                    authUser && ( 
                            <div className=" flex flex-col gap-10 ">
                                <motion.div 
                                    className="w-[50vw] float-right  mt-[15vh] sm:w-[70vw] flex flex-col sm:items-center sm:justify-center gap-5"
                                    initial={{translateX: '-100px',opacity:0}}
                                    animate={{translateX:0,opacity:1}}
                                    transition={{type:'tween',duration:0.6, delay:0.2}}
                                >
                                    <h1 className="text-[1rem] sm:text-[2.2rem] text-red-500 ">
                                        <strong>A Small Drop Can Make a Big Difference! </strong>
                                    </h1>
                                    <p className="w-[40vw] sm:text-center sm:w-[45vw] text-[0.7rem] sm:text-[1.3rem]">
                                    Donating blood saves lives. Every donation can help up to three people in need. Join the cause and make a difference today.
                                    </p>
                                </motion.div>
                                <motion.div 
                                    className="w-full sm:my-5  mt-[20vh] flex justify-center gap-8 sm:pr-96 sm:gap-16"
                                    initial={{translateY:'100vh',opacity:0}}
                                    animate={{translateY:0,opacity:1}}
                                    transition={{type:'tween',duration:1,delay:0.5}}
                                >
                                    <div onClick={(e)=>handleClick(e,"/donate")}>
                                        <AnimatedButton text="donate"/>
                                    </div>
                                    <div>
                                        <Button onClick={()=>reqRef?.current?.click()} className="text-nowrap bg-white dark:bg-black dark:text-white  cursor-pointer transition-all duration-200 rounded-md text-red-600 px-2 sm:px-4 py-1 sm:py-2 sm:w-32 sm:h-32 w-[25vw] h-[25vw] flex flex-col items-center justify-around "> 
                                            <span>
                                                <img className="sm:size-20 duration-200  " src={blood2} alt="" />
                                            </span>  
                                            <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" ref={reqRef} className="max-sm:text-[0.6rem] font-extrabold">Request </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>For whom are you going to request?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Note: Please select the correct recipient for the blood request.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel onClick={(e)=>handleClick(e,"/requestme")}className="border-[1px] border-red-500 text-red-500 hover:text-red-500">For Me</AlertDialogCancel>
                                                <AlertDialogAction onClick={(e)=>handleClick(e,"/request",0)}className="bg-red-500 hover:bg-red-600">Others</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                            </AlertDialog>
                                        </Button>  
                                    </div>
                                </motion.div>  
                            </div> 
                    )
                }
                </div> 
            </div>
            <div className="flex flex-col justify-center mt-24">
                {
                    !authUser && (
                        <div className="flex flex-col justify-evenly gap-5 pl-5 sm:pl-10">
                            <h1 className="text-[1.2rem] sm:text-[2rem] w-[60vw] sm:w-[40vw]"><strong>Be the Reason for Someone&rsquo;s Second Chance at Life</strong></h1>
                            <p className="w-[40vw] sm:text-[1.2rem]">Our non-profit platform connects blood donors with those in need, making life-saving donations easier and faster for everyone 🚑❤️</p>
                            <div className="flex gap-5">
                                <Link to='/login'>
                                    <button className="cursor-pointer text-nowrap border-[1px] border-violet-800 dark:text-white rounded-md px-2 py-1 sm:px-6 sm:py-3  text-violet-900 transition-all duration-300 hover:scale-105" > 
                                        Get Started
                                    </button>  
                                </Link>
                                <Link to='/learnmore'>
                                    <button className="cursor-pointer text-nowrap border-[1px] border-violet-800 rounded-md px-2 py-1 sm:px-5 sm:py-3 bg-violet-900 text-white transition-all duration-300 hover:scale-105" > 
                                        Learn More
                                    </button>  
                                </Link> 
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    )
}

export default Home
