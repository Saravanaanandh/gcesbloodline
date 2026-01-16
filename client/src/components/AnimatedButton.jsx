import React from 'react'
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

const AnimatedButton = ({text}) => { 
  return ( 
    <Button className="text-nowrap cursor-pointer rounded-md transition-all duration-200 text-red-600  px-2 sm:px-4 sm:py-2 w-[25vw] h-[25vw] sm:w-32 sm:h-32 flex flex-col items-center justify-around bg-white dark:bg-black dark:text-white"> 
        <motion.span animate={{translateY:[-10, 0,-10]}} transition={{repeat: Infinity, repeatType: "reverse", duration: 1, ease: "easeInOut"}}><img className="sm:size-20 duration-200" src={text == "donate" ? blood : blood2} alt="" /></motion.span>
        <span className="max-sm:text-[0.6rem] font-extrabold"> {text === 'donate' ? "Donate" :"Request"}</span>
    </Button>
  )
}

export default AnimatedButton