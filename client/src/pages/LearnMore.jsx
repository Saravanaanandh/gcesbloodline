import { useState } from "react";
import { motion } from "framer-motion";
import logo from './../assets/logo1.png'
import { Link } from "react-router-dom";

const sections = [
    {
      title: "Landing Page",
      content: `On the landing page, there are four buttons: "Get Started," "Sign Up," "Sign In," and another button.<br />
        Clicking "Get Started" or "Sign Up" will take you to the registration page.<br />
        Clicking "Sign In" will take you to the login page.`,
    },
    {
      title: "Sign Up & Login",
      content: `In the Sign-Up page, users must enter details like name, blood group, age, email, and password.<br />
        For Sign In, users must enter the same email and password they used during registration.<br />
        After registering or logging in, users are redirected to the Home page.`,
    },
    {
      title: "Home Page",
      content: `The Home page has three buttons: "Donate Blood," "Request for Blood," and "Profile" (top-right corner).<br />
        - Clicking "Donate Blood" navigates to the donation form.<br />
        - Clicking "Request for Blood" navigates to the request form.<br />
        - Clicking "Profile" opens the user's profile page.`,
    },
    {
      title: "Donation Form",
      content: `Users must fill out the donation form to indicate they are ready to donate blood.<br />
        Only after filling this form, their profile will be shown as available to blood requesters.<br />
        Simply registering is not enough; the donation form must be completed.`,
    },
    {
      title: "Request Form",
      content: `Users requesting blood will not see available donors until they complete the request form.<br />
        - After filling the form, available donors will be listed.<br />
        - Users can send requests to donors.<br />
        - If a request is sent again, previous details will be updated with new ones.<br />
        - The latest request details will be sent to donors.<br />`,
    },
    {
      title: "Profile Page",
      content: `Users can update their profile details, including profile picture, banner, phone number, etc.<br />
        - There is an "Availability" toggle. If turned off, the user will not be shown as an available donor.<br />
        - There are two buttons: "My Recipient" and "My Request," which navigate to respective pages.`,
    },
    {
      title: "My Request Page",
      content: `This page has three sections: "Available," "Request Sent," and "Accepted."<br />
        - *Available*: Shows donors only after filling the request form. Users can send requests.<br />
        - *Request Sent*: Displays donors to whom requests were sent along with status (initially "Pending").<br /> 
           &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Once a donor accepts, the status updates, and a "Confirm" button appears.<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Users can confirm one donor from the accepted ones.<br />
        - *Accepted*: Displays confirmed donors with their details for further contact.`,
    },
    {
      title: "My Recipient Page",
      content: `This page has three sections: "Request," "Accepted," and "Confirmed."<br />
        - *Request*: Shows incoming blood requests. Users can accept or reject them.<br />
        - *Accepted*: Displays accepted requests with a "Waiting" status. Once the requester confirms, it moves to the "Confirmed" section.<br />
        - *Confirmed*: Shows requests confirmed by the requester with a "Generate OTP" button.`,
    },
    {
      title: "Generate OTP",
      content: `Once the requester confirms, the donor will see the "Generate OTP" option under "Accepted" in the "My Recipient" page.<br />
        It is recommended to generate and verify the OTP only after meeting in person and completing the blood donation process.`,
    },
  ];
  

export default function LearnMore() {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="min-h-screen bg-white text-white p-9 ">
      <Link to='/'>
             <div className="sm:text-[1.2rem] cursor-pointer">
                <h1 className="flex items-center"><img className="mr-3 w-10 inline-block brightness-150" src={logo} alt="" />  <strong><span className="text-black">GCES </span><span className="text-blue-400">BLOOD LINE</span></strong></h1>
             </div>
      </Link>

      <div className="min-h-screen bg-gray-900 text-white p-6 rounded-lg mt-7 ">
      <div className="max-w-4xl mx-auto space-y-5 mt-6">
        {sections.map((section, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-gray-800/80 border border-gray-700 rounded-lg p-5 shadow-lg cursor-pointer transition-all duration-300 hover:bg-gray-700"
            onClick={() => setExpanded(expanded === index ? null : index)}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-300">{section.title}</h2>
              <span className="text-xl text-gray-400">
                {expanded === index ? "▲" : "▼"}
              </span>
            </div>

            {expanded === index && (
              <motion.p
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="mt-3 text-gray-400 text-[0.95rem] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: section.content }}
              />
            )}
          </motion.div>
        ))}
      </div>
    </div>
    </div>
  );
}