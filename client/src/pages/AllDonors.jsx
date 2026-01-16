import { Link } from "react-router";
import { useDonorStore } from "../store/useDonorStore.jsx";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import profilePic from "./../assets/user.png";
import {
  CheckCheck,
  CheckCircleIcon,
  Eye, 
  SendHorizontalIcon,
  TabletSmartphoneIcon,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.jsx";
import { motion } from "framer-motion"; 

const AllDonors = () => {
  const { authUser,isUserAsRecipient,isUserAsDonor } = useAuthStore();
  const { allDonors, donors, getDonor } = useDonorStore(); 

  const [isAvailable, setIsAvailable] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [filter, setFilter] = useState({
    fromage: 0,
    toage: 100,
    location: "",
    bloodType: "",
  }); 

  useEffect(() => { 
      allDonors(); 
  }, [allDonors]); 

  const availableDonors = donors.filter((donor) => { 
    const isAvailableDonor = donor.donorDetail?.available;
    const isRecipientRequest = donor.requestDetail === null ? true : false; 
    return isAvailableDonor && isRecipientRequest
  });
  const filteredDonors = availableDonors.filter((donor) => {
    return (
      donor.donorDetail?.age >= filter.fromage &&
      donor.donorDetail?.age <= filter.toage &&
      (filter.location === "" ||
        donor.donorDetail?.location === filter.location) &&
      (filter.bloodType === "" ||
        donor.donorDetail?.bloodType === filter.bloodType)
    );
  }); 
 
  const prependingRequests = donors.filter((donor) => (donor.requestDetail?.status === "prepending"));

  const acceptedDonors = donors.filter(
    (donor) =>
      ((donor.requestDetail?.status === "accepted") | (donor.requestDetail?.status === "pending"))
  )
   
  const completedRequests = donors.filter((donor) => ((donor.requestDetail?.status === "confirmed")|(donor.requestDetail?.status === "finalState")))
 
  return (
    <div>
      <Navbar />
      <h1 className="text-center text-red-600 text-[1.2rem] underline">
        <strong>All Donors</strong>
      </h1>
      <div className="min-h-svh flex max-sm:flex-col border-[1px] rounded-lg shadow-sm shadow-gray-400 mx-5 my-1 overflow-y-hidden">
        <div className="flex flex-col sm:h-[75vh] sm:w-[15vw] w-full">
          <div className="flex sm:flex-col">
            <div
              className="text-[1rem] sm:text-[1.2rem] cursor-pointer w-full m-3 flex h-[8vh] sm:h-[18vh] items-center justify-center rounded-lg shadow-sm shadow-gray-400"
              onClick={() => {
                setIsAvailable(true);
                setIsAccepted(false);
                setIsPending(false);
                setIsCompleted(false);
              }}
            >
              <span>Available</span>
            </div>
            <div
              className=" text-[1rem] sm:text-[1.2rem] cursor-pointer w-full m-3 flex h-[8vh] sm:h-[18vh] items-center justify-center rounded-lg shadow-sm shadow-gray-400"
              onClick={() => {
                setIsAvailable(false);
                setIsAccepted(false);
                setIsCompleted(false);
                setIsPending(true);
              }}
            >
              <span className="flex text-center">Request Sent</span>
            </div>
          </div>
          <div className="flex sm:flex-col">
            <div
              className="text-[1rem] sm:text-[1.2rem] cursor-pointer w-full m-3 flex h-[8vh] sm:h-[18vh] items-center justify-center rounded-lg shadow-sm shadow-gray-400"
              onClick={() => {
                setIsAvailable(false);
                setIsAccepted(true);
                setIsCompleted(false);
                setIsPending(false);
              }}
            >
              <span className="">Accepted</span>
            </div>
            <div
              className="text-[1rem] sm:text-[1.2rem] cursor-pointer w-full m-3 flex h-[8vh] sm:h-[18vh] items-center justify-center rounded-lg shadow-sm shadow-gray-400"
              onClick={() => {
                setIsAvailable(false);
                setIsAccepted(false);
                setIsPending(false);
                setIsCompleted(true);
              }}
            >
              <span className="">Completed</span>
            </div>
          </div>
        </div>
        <motion.div
          className={`w-full h-full flex flex-col gap-3 sm:mx-5 p-5 overflow-y-auto`}
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
          {!isAvailable && !isPending && !isAccepted && !isCompleted && (
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
                  <h2>✅ Available (Donors or Blood Stock Available)</h2>
                  <p>
                    🔹 Donors/Blood units are available in your selected
                    location.
                  </p>
                  <p>
                    🔹 Click on a donors profile to view details and contact
                    them.
                  </p>
                  <p>
                    🔹 You can directly send a request to an available donor.
                  </p>
                  <p>
                    🔹 If you find a match, proceed with the donation process.
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
                  <h2>📨 Request Sent (Pending Confirmation)</h2>
                  <p>
                    🔹 Your blood donation request has been successfully sent.
                  </p>
                  <p>
                    🔹 Please wait for the donor to respond to your request.
                  </p>
                  <p>🔹 You can check the request status in your dashboard.</p>
                  <p>
                    🔹 If no response within [X] hours, consider another donor.
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
          {
            isAvailable && !availableDonors.length && (
              <div className="w-full h-full flex flex-col gap-5 justify-center items-center">
                <span>No Donors Available!</span> 
              </div>
            )
          }
          {isAvailable && availableDonors.length > 0 && (
            <div>
            <div className=" flex justify-evenly items-center">
              <div className="flex max-sm:flex-col gap-2">
                <label>Age :</label>
                <select
                  className="bg-white text-black
        dark:bg-gray-900 dark:text-white max-sm:w-20 border-[1px] rounded-md "
                  onChange={(e) => {
                    const fromage = e.target.value.split("-")[0];
                    const toage = e.target.value.split("-")[1];
                    setFilter({
                      ...filter,
                      fromage: fromage,
                      toage: toage,
                    });
                  }}
                >
                  <option value="0-100" selected>
                    All
                  </option>
                  <option value="18-25">18-25</option>
                  <option value="26-35">26-35</option>
                  <option value="36-40">36-40</option>
                  <option value="40-100">40+</option>
                </select>
              </div>
              <div className=" max-sm:hidden flex max-sm:flex-col gap-2">
              <label>Location :</label>
              <select
                className="bg-white text-black
        dark:bg-gray-900 dark:text-white max-sm:w-20 border-[1px] rounded-md "
                onChange={(e) =>
                  setFilter({ ...filter, location: e.target.value })
                }
              >
                <option value="" selected>
                  All
                </option>
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
              </div>
              <div className="flex max-sm:flex-col gap-2">
                <label>Blood Group:</label>
                <select
                  className="bg-white text-black
        dark:bg-gray-900 dark:text-white max-sm:w-24 border-[1px] rounded-md "
                  onChange={(e) =>
                    setFilter({ ...filter, bloodType: e.target.value })
                  }
                >
                  <option value="" selected>
                    All
                  </option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="A1+">A1+</option>
                  <option value="A1-">A1-</option>
                  <option value="A2+">A2+</option>
                  <option value="A2-">A2-</option>
                  <option value="A1B+">A1B+</option>
                  <option value="A1B-">A1B-</option>
                  <option value="A2B+">A2B+</option>
                  <option value="A2B-">A2B-</option>
                  <option value="Bombay Blood Group">
                    Bombay Blood Group
                  </option>
                </select>
              </div>
            </div>
            <div className="sm:hidden w-full flex max-sm:flex-col gap-2">
              <label className="ml-[8vw]">Location :</label>
              <select
                className="bg-white text-black
        dark:bg-gray-900 dark:text-white mx-[8vw] border-[1px] rounded-md "
                onChange={(e) =>
                  setFilter({ ...filter, location: e.target.value })
                }
              >
                <option value="" selected>
                  All
                </option>
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
            </div>
            </div>
          )} 
          
          {isAvailable && availableDonors.length > 0 && !filteredDonors.length && (
            <div className="w-full h-full flex flex-col gap-5 justify-center items-center mt-10">
              <span>No Donors Found!</span>
            </div>
          )} 
          {isAvailable && filteredDonors.length > 0 && filteredDonors.map((donor) => (
            <Link
              className="w-full h-[15vh] shadow-sm shadow-gray-500 rounded-md px-5 hover:border-[1px] transition-all duration-100 cursor-pointer"
              key={donor.donor._id}
              // onClick={() => {
              //   getDonor(donor.donor.donorId);
              // }}
              to={`/alldonors/${donor.donor._id}`}
            >
              <div className="h-full flex max-sm:gap-2 sm:justify-between items-center">
                <div className="flex items-center gap-5">
                  <div>
                    <img
                      className=" size-10 sm:size-15 rounded-full "
                      src={donor.donorDetail.profile || profilePic}
                      alt=""
                    />
                  </div>
                  <div className="max-sm:hidden">
                    <h1 className="flex gap-3 items-center">
                      <strong>
                        {" "}
                        {donor.donorDetail.username.toUpperCase()}
                      </strong>
                      <div className="px-2 py-1 bg-red-600 text-white rounded-2xl">
                        {donor.donorDetail.bloodType}
                      </div>
                    </h1>
                    <p className="text-[0.9rem]">
                      {" "}
                      Age : {donor.donorDetail.age} | Gender :{" "}
                      {donor.donorDetail.gender} | location :{" "}
                      {donor.donorDetail.location}{" "}
                    </p>
                  </div>
                </div>
                <div className="sm:flex sm:flex-col sm:items-center">
                  <h1 className="sm:hidden text-[0.8rem] text-center flex gap-3 mb-2 items-center">
                    <strong>
                      {donor.donorDetail.username.toUpperCase()}
                    </strong>
                    <div className="px-1 py-0.5 bg-red-600 text-white rounded-2xl">
                      {donor.donorDetail.bloodType}
                    </div>
                  </h1>
                  {
                    isUserAsRecipient ? (
                      <button className="text-[0.8rem] flex items-center gap-1 sm:px-3 sm:py-2 p-1 border-[1px] transition-all duration-200 rounded-sm  bg-green-700 text-white">
                        Send Request <SendHorizontalIcon className="size-4" />
                      </button>
                    ):(
                      <button className="text-[0.8rem] flex items-center gap-1 sm:px-3 sm:py-2 p-1 border-[1px] transition-all duration-200 rounded-sm  bg-green-700 text-white">
                        View <Eye className="size-4" />
                      </button>
                    )
                  }
                  
                </div>
              </div>
            </Link>
          ))}  
          {isPending && !prependingRequests.length && (
            <div className="w-full h-full flex justify-center items-center">
              <span>No Pending Requests !</span>
            </div>
          )}
          {isPending &&
            prependingRequests.length > 0 &&
            prependingRequests.map((donor) => ( 
                <Link 
                  className="w-full h-[15vh] shadow-sm shadow-gray-500 rounded-md px-5 hover:border-[1px] transition-all duration-100 cursor-pointer"
                  key={donor.donor._id} 
                  to={`/alldonors/${donor.donor._id}`}
                >
                  <div className="h-full flex max-sm:gap-2 sm:justify-between items-center">
                    <div className="flex items-center gap-5">
                      <div>
                        <img
                          className="size-10 sm:size-15 rounded-full "
                          src={donor.donorDetail.profile || profilePic}
                          alt=""
                        />
                      </div>
                      <div className="max-sm:hidden">
                        <h1 className="flex gap-3 items-center">
                          <strong>
                            {" "}
                            {donor.donorDetail.username.toUpperCase()}
                          </strong>
                          <div className="px-2 py-1 bg-red-600 text-white rounded-2xl">
                            {donor.donorDetail.bloodType}
                          </div>
                        </h1>
                        <p className="text-[0.9rem]">
                          {" "}
                          Age : {donor.donorDetail.age} | Gender :{" "}
                          {donor.donorDetail.gender} | location :{" "}
                          {donor.donorDetail.location}{" "}
                        </p>
                      </div>
                    </div>
                    <div className="sm:flex sm:flex-col sm:items-center">
                      <h1 className="sm:hidden text-[0.8rem]  text-center flex gap-3 mb-2 items-center">
                        <strong>
                          {donor.donorDetail.username.toUpperCase()}
                        </strong>
                        <div className="px-1 py-0.5 bg-red-600 text-white rounded-2xl">
                          {donor.donorDetail.bloodType}
                        </div>
                      </h1>
                      <div>
                        <button
                          className={`flex items-center gap-1 p-1 sm:px-3 sm:py-2 rounded-sm bg-yellow-500 text-black`}
                        > 
                          Pending <TriangleAlert className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Link> 
          ))}
          {isAccepted && !acceptedDonors.length && (
            <div className="w-full h-full flex justify-center items-center">
              <span>No Accepting Donors !</span>
            </div>
          )}
          {isAccepted &&
            acceptedDonors.length > 0 &&
            acceptedDonors.map((donor) => (
              <Link
                className="w-full h-[15vh] shadow-sm shadow-gray-500 rounded-md px-5 hover:border-[1px] transition-all duration-100 cursor-pointer"
                key={donor.donor._id}
                // onClick={() => getDonor(donor.donor.donorId)}
                to={`/alldonors/${donor.donor._id}`}
              >
                <div className="h-full flex max-sm:gap-1 sm:justify-between items-center">
                  <div className="flex items-center gap-5">
                    <div>
                      <img
                        className="size-10 sm:size-15 rounded-full "
                        src={donor.donorDetail.profile || profilePic}
                        alt=""
                      />
                    </div>
                    <div className="max-sm:hidden">
                      <h1 className="flex gap-3 items-center">
                        <strong>
                          {" "}
                          {donor.donorDetail.username.toUpperCase()}
                        </strong>
                        <div className="px-2 py-1 bg-red-600 text-white rounded-2xl">
                          {donor.donorDetail.bloodType}
                        </div>
                      </h1>
                      <p className="text-[0.9rem]">
                        {" "}
                        Age : {donor.donorDetail.age} | Gender :{" "}
                        {donor.donorDetail.gender} | location :{" "}
                        {donor.donorDetail.location}{" "}
                      </p>
                    </div>
                  </div>
                  <div className="sm:flex sm:flex-col sm:items-center">
                    <h1 className="sm:hidden text-[0.8rem]  text-center flex gap-3 mb-2 items-center">
                      <strong>
                        {donor.donorDetail.username.toUpperCase()}
                      </strong>
                      <div className="px-1 py-0.5 bg-red-600 text-white rounded-2xl">
                        {donor.donorDetail.bloodType}
                      </div>
                    </h1>

                    <button className={`flex items-center gap-1 p-1 sm:px-3 sm:py-2 rounded-sm ${ donor.requestDetail?.status === "accepted"
                        ? "bg-green-700 text-white"
                        : "bg-yellow-500 text-black"}`}>
                        {donor.requestDetail?.status === "accepted"
                          ? "confirm"
                          : "Pending"}
                      {donor.requestDetail?.status === "pending" ? (
                        <TriangleAlert />
                      ) : (
                        <SendHorizontalIcon className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              </Link>
          ))}
          {isCompleted && !completedRequests.length && (
            <div className="w-full h-full flex justify-center items-center">
              <span>You didn't complete any requests!</span>
            </div>
          )}
          {isCompleted &&
            completedRequests.length > 0 &&
            completedRequests.map((donor) => (
              <Link
                className="w-full h-[15vh] shadow-sm shadow-gray-500 rounded-md px-5 hover:border-[1px] transition-all duration-100 cursor-pointer"
                key={donor.donor._id}
                // onClick={() => getDonor(donor.donor.donorId)}
                to={`/alldonors/${donor.donor._id}`}
              >
                <div className="h-full flex max-sm:gap-1 sm:justify-between items-center">
                  <div className="flex items-center gap-5">
                    <div>
                      <img
                        className="size-10 sm:size-15 rounded-full "
                        src={donor.donorDetail.profile || profilePic}
                        alt=""
                      />
                    </div>
                    <div className="max-sm:hidden">
                      <h1 className="flex gap-3 items-center">
                        <strong>
                          {" "}
                          {donor.donorDetail.username.toUpperCase()}
                        </strong>
                        <div className="px-2 py-1 bg-red-600 text-white rounded-2xl">
                          {donor.donorDetail.bloodType}
                        </div>
                      </h1>
                      <p className="text-[0.9rem]">
                        {" "}
                        Age : {donor.donorDetail.age} | Gender :{" "}
                        {donor.donorDetail.gender} | location :{" "}
                        {donor.donorDetail.location}{" "}
                      </p>
                    </div>
                  </div>
                  <div className="sm:flex sm:flex-col sm:items-center">
                    <h1 className="sm:hidden text-[0.8rem] text-center flex gap-3 mb-2 items-center">
                      <strong>
                        {donor.donorDetail.username.toUpperCase()}
                      </strong>
                      <div className="px-1 py-0.5 bg-red-600 text-white rounded-2xl">
                        {donor.donorDetail.bloodType}
                      </div>
                    </h1>

                    <button className="flex items-center gap-1 p-1 sm:px-3 sm:py-2 rounded-sm bg-green-700 text-white">
                      {donor.requestDetail?.status === "confirmed"
                        ? "VerifyOTP"
                        : "Completed"}
                      {donor.requestDetail?.status === "confirmed" ? (
                        <TabletSmartphoneIcon className="size-4" />
                      ) : (
                        <CheckCircleIcon />
                      )} 
                    </button>
                  </div>
                </div>
              </Link>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default AllDonors;