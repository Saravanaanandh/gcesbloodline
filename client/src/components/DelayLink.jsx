import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom"; 
import styled from "styled-components";

const BloodDriver = styled(motion.div)`  
    overflow-x: hidden;
    position: absolute;
    width: 350px; 
    bottom:0;  
    left: ${props => props.CheckClick ? '85vw':'0'}; 
    object-fit: cover;
    filter: drop-shadow(1px 1px 2px black);
    transition: all 1.8s linear;
`
const DelayedLink = () => { 
  return (
    <BloodDriver  
        initial={{translateX:'1250px',scale:0.4}}
        animate={{translateX:'-100px',scale:1}}
        transition={{type:'tween',duration:2.5,delay:2}}
    >
        <DotLottieReact 
            className="relative bottom-0"
            src="https://lottie.host/644536b1-b213-4ef5-8897-60ba66a505bc/9Ersqo5gFe.lottie"
            loop
            autoplay
        /> 
    </BloodDriver>
  )
};

export default DelayedLink;
