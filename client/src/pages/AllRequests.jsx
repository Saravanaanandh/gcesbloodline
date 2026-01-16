import { Link } from "react-router";
import { useRecipientStore } from "../store/useRecipientStore.jsx";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  CheckCircle,
  Clock,
  Eye,
  MoveRight,
  Smartphone,
  X,
} from "lucide-react";
import profilePic from "./../assets/user.png";
import { useAuthStore } from "../store/useAuthStore.jsx";

const AllRequests = () => {
  const { allRequests, recipients,requests, getRequest,allRecipients,getRecipient,deleteRequest } = useRecipientStore();
  const { authUser,isUserAsRecipient } = useAuthStore();
  const [isRecipients, setIsRecipients] = useState(false);
  const [isRequests, setIsRequests] = useState(false);
  const [isAcceptedRequests, setIsAcceptedRequests] = useState(false);
  const [isCompletedRequest, setIsCompletedRequests] = useState(false);

  useEffect(() => {    
      allRecipients();
  }, [allRecipients]); 
 
  const allRecipient = recipients.filter(recipient=>( recipient.request === null && !recipient.recipient?.isDonorFinded) ? recipient :"")
  const prependingRequests = recipients.filter((recipient) => (recipient.request?.status === "prepending"));
  const acceptedrequests = recipients.filter(
    (recipient) =>
      ((recipient.request?.status === "accepted") | (recipient.request?.status === "pending")) 
  );
  const completedRequests = recipients.filter((recipient) => ((recipient.request?.status === "confirmed")|(recipient.request?.status === "finalState")));

  return (
    <div>
      <Navbar />
      <h1 className="text-center text-red-600 text-[1.2rem] underline">
        <strong>All Requests</strong>
      </h1>
      <div className="min-h-svh flex max-sm:flex-col border-[1px] rounded-lg shadow-sm shadow-gray-400 mx-5 my-1 overflow-y-hidden">
        <div className="flex flex-col sm:h-[75vh] sm:w-[15vw] w-full">
          <div className="flex sm:flex-col">
            <div
              className="text-[1rem] sm:text-[1.2rem] cursor-pointer w-full m-3 flex h-[8vh] sm:h-[18vh] items-center justify-center rounded-lg shadow-sm shadow-gray-400"
              onClick={() => {
                setIsRequests(false);
                setIsRecipients(true);
                setIsAcceptedRequests(false);
                setIsCompletedRequests(false);
              }}
            >
              <span className="">Recipients</span>
            </div>
            <div
              className="text-[1rem] sm:text-[1.2rem] cursor-pointer w-full m-3 flex h-[8vh] sm:h-[18vh] items-center justify-center rounded-lg shadow-sm shadow-gray-400"
              onClick={() => {
                setIsRequests(true);
                setIsRecipients(false);
                setIsAcceptedRequests(false);
                setIsCompletedRequests(false);
              }}
            >
              <span className="">Requests</span>
            </div> 
          </div>
          <div className="flex sm:flex-col">
            <div
              className="cursor-pointer w-full m-3 flex h-[8vh] sm:h-[18vh] items-center justify-center rounded-lg shadow-sm shadow-gray-400"
              onClick={() => {
                setIsAcceptedRequests(true);
                setIsRequests(false);
                setIsRecipients(false);
                setIsCompletedRequests(false);
              }}
            >
              <span className="">Accepted</span>
            </div>
            <div
              className="cursor-pointer w-full m-3 flex h-[8vh] sm:h-[18vh] items-center justify-center rounded-lg shadow-sm shadow-gray-400"
              onClick={() => {
                setIsAcceptedRequests(false);
                setIsRequests(false);
                setIsRecipients(false);
                setIsCompletedRequests(true);
              }}
            >
              <span className="">Confirmed</span>
            </div> 
          </div>
        </div>
        <motion.div
          className="w-full h-full flex flex-col gap-3 sm:mx-5 p-5 overflow-y-hidden"
          initial={{
            transform: "translateY(200%)",
            opacity: 0,
          }}
          animate={{
            transform: "translateY(0px)",
            opacity: 1,
          }}
          transition={{ type: "spring", duration: 2, delay: 1 }}
        >
          {!isRecipients && !isRequests && !isAcceptedRequests && !isCompletedRequest && (
            <div className="w-full flex flex-col gap-3 justify-center items-center overflow-y-hidden">
              <motion.h1 className="font-bold text-[1.2rem] font-mono text-center">
                📌 Menu Instructions
              </motion.h1>
              <div className="w-full flex flex-col gap-3">
                <motion.div
                  className="w-full border-[1px] rounded-md shadow-sm shadow-gray-400"
                  initial={{
                    transform: "translateY(200%)",
                    opacity: 0,
                    scale: 0,
                  }}
                  animate={{
                    transform: "translateY(0px)",
                    opacity: 1,
                    scale: 1,
                  }}
                  transition={{ type: "spring", duration: 1.2, delay: 1 }}
                >
                  <h2>🩸 Request Blood</h2>
                  <p>
                    🔹 Click the <b>&quot;Request&quot;</b> button to submit a
                    blood request.
                  </p>
                  <p>
                    🔹 Provide accurate details, including blood type, required
                    units, and hospital/location
                  </p>
                  <p>
                    🔹 Ensure your contact information is correct for a quick
                    response.
                  </p>
                </motion.div>

                <motion.div
                  className="w-full border-[1px] rounded-md shadow-sm shadow-gray-400"
                  initial={{
                    transform: "translateY(200%)",
                    opacity: 0,
                    scale: 0,
                  }}
                  animate={{
                    transform: "translateY(0px)",
                    opacity: 1,
                    scale: 1,
                  }}
                  transition={{ type: "spring", duration: 1.1, delay: 1.4 }}
                >
                  <h2>✅ Confirm Donation(Pending Confirmation)</h2>
                  <p>
                    🔹 Once a donor has been assigned, click the{" "}
                    <b>&quot;Confirm&quot;</b> button to acknowledge receipt.
                  </p>
                  <p>
                    🔹 This helps update the system and allows others to request
                    assistance.
                  </p>
                </motion.div>

                <motion.div
                  className="w-full border-[1px] rounded-md shadow-sm shadow-gray-400"
                  initial={{
                    transform: "translateY(200%)",
                    opacity: 0,
                    scale: 0,
                  }}
                  animate={{
                    transform: "translateY(0px)",
                    opacity: 1,
                    scale: 1,
                  }}
                  transition={{ type: "spring", duration: 1, delay: 1.6 }}
                >
                  <h2>🎉 Accepted (Request Approved)</h2>
                  <p>🔹 Your request has been accepted!</p>
                  <p>
                    🔹 You will receive donor details and further instructions.
                  </p>
                  <p>🔹 Please contact the donor to coordinate the donation.</p>
                  <p>🔹 Follow safety and health guidelines before donation.</p>
                </motion.div>
              </div>
            </div>
          )}
          {isRecipients && !allRecipient.length && (
            <div className="w-full h-full flex justify-center items-center">
              <span>No Recipients!</span>
            </div>
          )}
          {isRecipients &&
            allRecipient.length > 0 &&
            allRecipient.map((recipient) => (
              <Link
                className="w-full h-[15vh] shadow-sm shadow-gray-500 rounded-md px-5 hover:border-[1px] transition-all duration-100 cursor-pointer"
                key={recipient.recipient._id}
                // onClick={() => getRecipient(recipient.recipientProfile.recipientId)}
                to={`/allrequests/${recipient.recipient._id}`}
              >
                <div className="h-full flex max-sm:gap-10 sm:justify-between  items-center">
                  <div className="flex items-center gap-5">
                    <div>
                      <img
                        className="size-10 sm:size-15 rounded-full"
                        src={recipient.recipientProfile.profile || profilePic}
                        alt=""
                      />
                    </div>
                    <div className="max-sm:hidden"> 
                      <div className="flex gap-5 items-center">
                        <h1>
                          <strong>
                            {" "}
                            {recipient.recipientProfile.username.toUpperCase()}
                          </strong>
                        </h1>
                        <div className="flex items-center gap-5">
                          <p>
                          Requested Blood: <span  className="px-2 py-1 bg-red-600 text-white rounded-2xl">{recipient.recipient?.bloodType}</span>
                          </p> 
                          {
                            recipient.recipient?.isCritical === true ? ( 
                              <span className="px-2 flex gap-2 py-1 bg-red-600 text-white animate-caret-blink rounded-md">
                              <span className="max-sm:hidden">Emergency</span> <AlertTriangle/>
                              </span> 
                            ):("")
                          } 
                        </div> 
                      </div>
                      <p className="text-[0.9rem]">
                        {" "}
                        Age : {recipient.recipient?.patientsage} | Gender :{" "}
                        {recipient.recipient?.gender} | location :{" "}
                        {recipient.recipient?.location}{" "}
                      </p>
                    </div>
                  </div>
                  <div className="sm:flex sm:flex-col sm:items-center">
                    <h1 className="sm:hidden">
                      <strong>
                        {" "}
                        {recipient.recipientProfile?.username.toUpperCase()}
                      </strong>
                    </h1>
                    <button className="flex items-center gap-1 px-3 py-2 border-[1px] transition-all duration-200 rounded-sm  bg-green-700 text-white">
                      View <Eye className="size-4" />
                    </button>
                  </div>
                  <div className="sm:hidden flex flex-col items-center gap-2">
                    <p>
                    <span  className="p-1 bg-red-600 text-white rounded-2xl">{recipient.recipient?.bloodType}</span>
                    </p> 
                    {
                      recipient.recipient?.isCritical === true ? 
                        recipient.request?.status !== "finalState" && (
                        <span className="px-2 py-1 bg-red-600 text-white animate-caret-blink rounded-md">
                          <span className="max-sm:hidden">Emergency</span> <AlertTriangle/>
                        </span> 
                      ):("")
                    } 
                  </div> 
                </div>
              </Link>
          ))}
          {isRequests && !prependingRequests.length && (
            <div className="w-full h-full flex justify-center items-center">
              <span>No Requests !</span>
            </div>
          )}
          {isRequests &&
            prependingRequests.length > 0 &&
            prependingRequests.map((recipient) => (
              <Link
                className="w-full h-[15vh] shadow-sm shadow-gray-500 rounded-md px-5 hover:border-[1px] transition-all duration-100"
                key={recipient.recipient._id}
                // onClick={() => getRequest(request.recipientProfile.recipientId)}
                to={`/allrequests/${recipient.recipient._id}`}
              >
                <div className="h-full flex max-sm:gap-2 sm:justify-between items-center">
                  <div className="flex justify-between items-center gap-5">
                    <div>
                      <img
                        className="size-10 sm:size-15 rounded-full "
                        src={recipient.recipientProfile.profile || profilePic}
                        alt=""
                      />
                    </div>
                    <div className="max-sm:hidden">
                      <div className="flex gap-5 items-center">
                        <h1>
                          <strong>
                            {" "}
                            {recipient.recipientProfile.username.toUpperCase()}
                          </strong>
                        </h1>
                        <div className="flex items-center gap-5">
                          <p>
                          Requested Blood: <span  className="px-2 py-1 bg-red-600 text-white rounded-2xl">{recipient.recipient?.bloodType}</span>
                          </p> 
                          {
                            recipient.recipient?.isCritical === true ? ( 
                              <span className="px-2 py-1 bg-red-600 text-white rounded-md">
                                Emergency
                              </span> 
                            ):("")
                          } 
                        </div> 
                      </div>
                      
                      <p className="text-[0.9rem]">
                        {" "}
                        Age : {recipient.recipient?.patientsage} | Gender :{" "}
                        {recipient.recipient?.gender} | location :{" "}
                        {recipient.recipient?.location}{" "}
                      </p>
                    </div>
                  </div>
                  <div className="sm:flex sm:flex-col sm:items-center">
                    <h1 className="sm:hidden  text-[0.8rem]">
                      <strong>
                        {" "}
                        {recipient.recipientProfile?.username.toUpperCase()}
                      </strong>
                    </h1>
                    <button className="flex items-center gap-1 p-1 max-sm:text-[0.7rem] sm:px-3 sm:py-2 border-[1px] transition-all duration-200 rounded-sm  bg-green-700 text-white">
                      Accept <MoveRight className="size-4" />
                    </button>
                  </div>
                  <div className="sm:hidden flex flex-col items-center gap-2">
                    <p>
                    <span  className="p-1 bg-red-600 text-white rounded-2xl">{recipient.recipient?.bloodType}</span>
                    </p> 
                    {
                      recipient.recipient?.isCritical === true ? 
                        recipient.request?.status !== "finalState" && (
                        <span className="px-2 py-1 bg-red-600 text-white animate-caret-blink rounded-md">
                          <span className="max-sm:hidden">Emergency</span> <AlertTriangle/>
                        </span> 
                      ):("")
                    } 
                  </div> 
                </div>
              </Link>
          ))}
          {isAcceptedRequests && !acceptedrequests.length && (
            <div className="w-full h-full flex justify-center items-center">
              <span> No confirmed Requests!</span>
            </div>
          )}
          {isAcceptedRequests &&
            acceptedrequests.length > 0 &&
            acceptedrequests.map((recipient) => (
              <Link
                className="w-full h-[15vh] shadow-sm shadow-gray-500 rounded-md px-5 hover:border-[1px] transition-all duration-100 cursor-pointer"
                key={recipient.recipient._id}
                // onClick={() => getRequest(recipient.recipientProfile.recipientId)}
                to={`/allrequests/${recipient.recipient._id}`}
              >
                <div className="h-full flex max-sm:gap-2 sm:justify-between items-center">
                  <div className="flex items-center gap-5">
                    <div>
                      <img
                        className="size-10 sm:size-15 rounded-full "
                        src={recipient.recipientProfile.profile || profilePic}
                        alt=""
                      />
                    </div>
                    <div className="max-sm:hidden">
                      <div className="flex gap-5 items-center">
                        <h1>
                          <strong>
                            {" "}
                            {recipient.recipientProfile.username.toUpperCase()}
                          </strong>
                        </h1>
                        <div className="flex items-center gap-5">
                          <p>
                          Requested Blood: <span  className="px-2 py-1 bg-red-600 text-white rounded-2xl">{recipient.recipient?.bloodType}</span>
                          </p> 
                          {
                            recipient.recipient?.isCritical === true ? ( 
                              <span className="px-2 py-1 bg-red-600 text-white rounded-md">
                                Emergency
                              </span> 
                            ):("")
                          } 
                        </div> 
                      </div>
                      <p className="text-[0.9rem]">
                        {" "}
                        Age : {recipient.recipient?.patientsage} | Gender :{" "}
                        {recipient.recipient?.gender} | location :{" "}
                        {recipient.recipient?.location}{" "}
                      </p>
                    </div>
                  </div>
                  <div className="sm:flex sm:flex-col sm:items-center">
                    <h1 className="sm:hidden text-[0.8rem]">
                      <strong>
                        {" "}
                        {recipient.recipientProfile.username.toUpperCase()}
                      </strong>
                    </h1>
                    <button className={`flex items-center gap-1 sm:px-3 sm:py-2 p-1 rounded-sm text-white ${recipient.request?.status === "accepted" ? "bg-yellow-700 ":"bg-green-700"}`}>
                      {
                        recipient.request?.status === "accepted"
                          ? "Waiting"
                          : "Confirm"
                      }
                      {
                        recipient.request?.status === "accepted" ? (
                          <Clock />
                        ):(
                          <MoveRight /> 
                        )
                      }
                    </button>
                  </div>
                  <div className="sm:hidden flex flex-col items-center gap-2">
                    <p>
                    <span  className="p-1 bg-red-600 text-white rounded-2xl">{recipient.recipient?.bloodType}</span>
                    </p> 
                    {
                      recipient.recipient?.isCritical === true ? 
                        recipient.request?.status !== "finalState" && (
                        <span className="px-2 py-1 bg-red-600 text-white animate-caret-blink rounded-md">
                          <span className="max-sm:hidden">Emergency</span> <AlertTriangle/>
                        </span> 
                      ):("")
                    } 
                  </div> 
                </div>
              </Link>
            ))}
          {isCompletedRequest && !completedRequests.length && (
            <div className="w-full h-full flex justify-center items-center">
              <span>No History of completed Requests!</span>
            </div>
          )}
          {isCompletedRequest &&
            completedRequests.length > 0 &&
            completedRequests.map((recipient) => (
              <Link
                className="w-full h-[15vh] shadow-sm shadow-gray-500 rounded-md px-5 hover:border-[1px] transition-all duration-100 cursor-pointer"
                key={recipient.recipient._id}
                // onClick={() => getRequest(recipient.recipientProfile.recipientId)}
                to={`/allrequests/${recipient.recipient._id}`}
              >
                <div className="h-full flex max-sm:gap-2 justify-between items-center">
                  <div className="flex justify-between items-center gap-5">
                    <div>
                      <img
                        className="size-10 sm:size-15 rounded-full"
                        src={recipient.recipientProfile.profile || profilePic}
                        alt=""
                      />
                    </div>
                    <div className="max-sm:hidden">
                      <div className="flex gap-5 items-center">
                        <h1>
                          <strong>
                            {" "}
                            {recipient.recipientProfile.username.toUpperCase()}
                          </strong>
                        </h1>
                        <div className="flex items-center gap-5">
                          <p>
                          Requested Blood: <span  className="px-2 py-1 bg-red-600 text-white rounded-2xl">{recipient.recipient?.bloodType}</span>
                          </p> 
                          {
                            recipient.recipient?.isCritical === true ? ( 
                              <span className="px-2 py-1 flex gap-2 items-center bg-red-600 text-white animate-caret-blink rounded-md">
                                <span className="max-sm:hidden">Emergency</span> <AlertTriangle/>
                              </span> 
                            ):("")
                          } 
                        </div> 
                      </div>
                      <p className="max-sm:hidden text-[0.9rem]">
                        {" "}
                        Age : {recipient.recipient?.patientsage} | Gender :{" "}
                        {recipient.recipient?.gender} | location :{" "}
                        {recipient.recipient?.location}{" "}
                      </p>
                    </div>
                  </div>
                  <div className="sm:flex sm:flex-col sm:items-center">
                    <h1 className="sm:hidden text-[0.6rem]">
                      <strong>
                        {" "}
                        {recipient.recipientProfile?.username.toUpperCase()}
                      </strong>
                    </h1>
                    <button
                      className={`flex items-center max-sm:text-[0.7rem] gap-1 sm:px-3 p-1 sm:py-2 rounded-sm bg-green-700  text-white`}
                    >  
                      {recipient.request?.status === "confirmed"
                        ? "Generate OTP"
                        : "Completed"}
                      {recipient.request?.status === "confirmed" ? (
                        <Smartphone className="size-4" />
                      ) : (
                        <CheckCircle />
                      )} 
                    </button> 
                  </div>
                  <div className="sm:hidden flex flex-col items-center gap-2">
                    <p>
                    <span  className="p-1 bg-red-600 text-white rounded-2xl">{recipient.recipient?.bloodType}</span>
                    </p> 
                    {
                      recipient.recipient?.isCritical === true ? 
                        recipient.request?.status !== "finalState" && (
                        <span className="px-2 py-1 bg-red-600 text-white animate-caret-blink rounded-md">
                          <span className="max-sm:hidden">Emergency</span> <AlertTriangle/>
                        </span> 
                      ):("")
                    } 
                  </div> 
                </div>
              </Link>
            ))}
        </motion.div>
      </div>
    </div>
  );
};

export default AllRequests;
