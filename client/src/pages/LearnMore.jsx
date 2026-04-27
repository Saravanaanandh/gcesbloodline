import { useState } from "react";
import { motion } from "framer-motion";
import logo from './../assets/logo1.png'
import { Link } from "react-router-dom";

const sections = [
  {
    title: "Login / Sign Up",
    badge: "Authentication",
    items: [
      {
        heading: "🔐 Sign Up",
        desc: "Used to create a new account. User enters their details (name, blood group, age, email, password) to register.",
      },
      {
        heading: "🔑 Login",
        desc: "Used to access an existing account. User enters their registered email and password to log in.",
      },
      {
        heading: "🔒 Forgot Password",
        desc: "Used when the password is forgotten. An OTP will be sent to the registered email. The user enters the OTP and resets the password.",
      },
    ],
  },
  {
    title: "Main Actions",
    badge: "Core Features",
    items: [
      {
        heading: "👤 Profile Button",
        desc: "Clicking this button redirects the user to their Profile Page.",
      },
      {
        heading: "🩸 Donate Button",
        desc: "For users ready to donate blood. The user must fill the donor form to proceed.",
        warning: "If the form is not filled: The user cannot donate blood, will not appear as a donor to recipients, and cannot be viewed or contacted by others.",
      },
      {
        heading: "📋 Request Button",
        desc: "Used to request blood. The user must fill the required form to send a request.",
        warning: "If the form is not filled: The user cannot request blood, cannot contact donors, and cannot send requests or book donors.",
      },
      {
        heading: "❓ FAQ",
        desc: "Q: I filled the blood request form incorrectly. How can I update it?",
        answer: "A: You can simply fill the form again, and it will be updated automatically.",
      },
    ],
  },
  {
    title: "Navigation Buttons",
    badge: "Navigation",
    items: [
      {
        heading: "🧑‍🤝‍🧑 Donor Button",
        desc: "When clicked, it opens and displays the donors list page.",
      },
      {
        heading: "🙋 Recipients Button",
        desc: "When clicked, it displays a list of people who have requested blood.",
      },
      {
        heading: "✅ Available Button",
        desc: "Used to toggle donor status. ON → shows your profile to recipients. OFF → hides it and marks you as unavailable.",
      },
    ],
  },
  {
    title: "Donor Flow",
    badge: "Donor Actions",
    items: [
      {
        heading: "🙋 Recipient Button",
        desc: "Displays the complete list of all users who have requested blood.",
      },
      {
        heading: "📨 Request Button",
        desc: "Displays all requests sent to donors in a Pending state. Once the donor accepts, the request moves to the Accepted section.",
      },
      {
        heading: "✔️ Accepted Button",
        desc: "Shows requests accepted by donors. When the user clicks Confirm, the request is processed further and moves to the Confirmed section. OTP verification is required.",
      },
      {
        heading: "🏁 Confirmed Button",
        desc: "Shows completed requests after final confirmation. After meeting the donor: an OTP is sent to your email. Share the OTP with the donor. Once verified → status becomes Completed.",
      },
    ],
  },
  {
    title: "Blood Request Flow",
    badge: "Recipient Actions",
    items: [
      {
        heading: "🟢 Available Button",
        desc: "Displays the list of available donors based on location. You must fill the recipient form to send a request.",
      },
      {
        heading: "📤 Request Sent Button",
        desc: "Shows the donors you have requested. Status = Pending until the donor accepts.",
      },
      {
        heading: "✅ Accepted Button",
        desc: "Shows donors who have accepted your request. Status = Waiting. After the donor confirms → moves to Confirmed.",
      },
      {
        heading: "🏆 Completed Button",
        desc: "After confirmation → Generate OTP. OTP is sent to the donor's email. After verification → status becomes Completed.",
      },
    ],
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
              className="bg-gray-800/80 border border-gray-700 rounded-xl shadow-lg overflow-hidden"
            >
              {/* Accordion Header */}
              <div
                className="flex justify-between items-center p-5 cursor-pointer hover:bg-gray-700/60 transition-all duration-300"
                onClick={() => setExpanded(expanded === index ? null : index)}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-semibold text-gray-100">{section.title}</h2>
                  {section.badge && (
                    <span className="text-[0.7rem] font-medium px-2 py-0.5 rounded-full bg-red-600/30 text-red-300 border border-red-500/30">
                      {section.badge}
                    </span>
                  )}
                </div>
                <span
                  className="text-xl text-gray-400 transition-transform duration-300 ml-3 flex-shrink-0"
                  style={{ transform: expanded === index ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  ▼
                </span>
              </div>

              {/* Accordion Body */}
              {expanded === index && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="px-5 pb-5 space-y-3 border-t border-gray-700/60"
                >
                  {section.items.map((item, i) => (
                    <div key={i} className="mt-3 bg-gray-900/60 border border-gray-700 rounded-lg p-4 space-y-2">
                      <p className="text-white font-semibold text-[0.97rem]">{item.heading}</p>
                      <p className="text-gray-400 text-[0.9rem] leading-relaxed">{item.desc}</p>
                      {item.warning && (
                        <div className="mt-2 bg-red-900/25 border border-red-500/30 rounded-md px-3 py-2 text-red-300 text-[0.85rem]">
                          ⚠️ {item.warning}
                        </div>
                      )}
                      {item.answer && (
                        <div className="mt-2 bg-green-900/25 border border-green-500/30 rounded-md px-3 py-2 text-green-300 text-[0.85rem]">
                          💡 {item.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}