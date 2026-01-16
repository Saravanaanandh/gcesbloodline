import React, { useRef } from 'react'
import styled, { keyframes } from "styled-components"
import { motion } from "framer-motion"
import blood from './../assets/drop.png'
import blood2 from './../assets/hand.png' 

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
const AnimatedAlertBtn = () => {
    const reqRef = useRef()
  return (
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
  )
}

export default AnimatedAlertBtn