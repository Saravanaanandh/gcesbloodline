import { Link } from "react-router";
import { useDonorStore } from "../store/useDonorStore.jsx";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import profilePic from "./../assets/user.png";
import {
  BadgeCheck,
  Droplets,
  Heart,
  Info,
  MapPin,
  SendHorizontal,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.jsx";
import { motion } from "framer-motion";
import FormRequiredModal from "../components/FormRequiredModal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatTimeLeft } from "../lib/deadline.js";
import { donorAction } from "../lib/requestStatus.js";

/**
 * One row for one donor, in every tab.
 *
 * The four tabs used to each carry their own copy of this markup and their own idea of what to
 * put in the button, so the same state was a green "confirm" in one tab and a yellow "Pending" in
 * another. The pill and the chip both come from donorAction now, so a row cannot describe itself
 * two different ways.
 */
const DonorRow = ({ donor, action, onBlocked }) => {
  const detail = donor.donorDetail || {};
  const ActionIcon = action.Icon;

  return (
    <Link
      to={`/alldonors/${donor.donor._id}`}
      className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md hover:border-red-300 dark:hover:border-red-500/50 transition-all"
    >
      <img
        className="size-12 sm:size-14 rounded-full object-cover ring-2 ring-neutral-100 dark:ring-neutral-800 shrink-0 self-start sm:self-auto"
        src={detail.profile || profilePic}
        alt={detail.username || "Donor"}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold text-neutral-900 dark:text-white truncate">
            {detail.username || "Donor"}
          </h2>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold">
            <Droplets className="size-3 fill-current" /> {detail.bloodType || "--"}
          </span>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{detail.age ? `${detail.age} years` : "Age not set"}</span>
          <span>{detail.gender || "Gender not set"}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" /> {detail.location || "Location not set"}
          </span>
        </p>
        {/* the backend expires an acceptance that is never confirmed, so the recipient can see
            how long is left before choosing someone else */}
        {donor.requestDetail?.respondBy && (
          <p className="mt-1 text-[0.7rem] font-semibold text-amber-600 dark:text-amber-400">
            {formatTimeLeft(donor.requestDetail.respondBy)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
        <StatusBadge meta={action} size="sm" />
        <button
          type="button"
          onClick={(e) => {
            // The row itself is the link. This chip only intercepts when there is something to
            // say first - no recipient form yet - and otherwise lets the navigation through.
            if (action.kind === "view") {
              e.preventDefault();
              onBlocked?.();
            }
          }}
          title={action.description}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border transition-all ${
            action.disabled
              ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-default"
              : `${action.classes.solid} border-transparent shadow-sm cursor-pointer`
          }`}
        >
          {ActionIcon && <ActionIcon className="size-3.5" />}
          <span className="max-sm:hidden">{action.actionLabel}</span>
        </button>
      </div>
    </Link>
  );
};

const AllDonors = () => {
  const { isUserAsRecipient } = useAuthStore();
  const {
    allDonors, donors, bloodRequestExpired, bloodRequestClosedReason,
    viewerCommitted, viewerCommittedDonorId
  } = useDonorStore();

  const [isAvailable, setIsAvailable] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
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

  /**
   * What this recipient may do about one donor.
   *
   * This used to be decided per tab from `donor.donor.committedRequestId` and a locally derived
   * `hasConfirmedDonor`. The first is now returned only to the donor themselves - so the check
   * silently never fired and every committed donor looked available - and the second was a third
   * opinion about a lock the server already reports. Both are replaced by `isCommitted` and the
   * viewer's own commitment, which is what the API enforces.
   */
  const actionFor = (donor) => donorAction({
    status: donor.requestDetail?.status,
    donorIsCommitted: Boolean(donor.donor?.isCommitted),
    viewerIsRecipient: isUserAsRecipient,
    viewerCommitted,
    viewerCommittedDonorId,
    donorId: donor.donor?.donorId,
    requestClosed: bloodRequestExpired,
    closedReason: bloodRequestClosedReason,
  })

  return (
    <div>
      <FormRequiredModal
        isOpen={showRecipientModal}
        onClose={() => setShowRecipientModal(false)}
        userType="recipient"
      />
      <Navbar />
      <h1 className="text-center text-red-600 text-[1.2rem] underline">
        <strong>All Donors</strong>
      </h1>
      {/* This request is closed - the donation completed, or the blood-needed date passed - so
          the server refuses any action on it. The directory stays browsable; only the actions
          are dead. A fulfilled request gets its own copy: it is a success, not a warning. */}
      {bloodRequestExpired && bloodRequestClosedReason === "fulfilled" && (
        <div className="mx-5 mt-3 rounded-md border-[1px] border-green-600 bg-green-50 dark:bg-green-950/40 p-3 flex flex-wrap items-center gap-3">
          <Heart className="size-5 shrink-0 text-green-700 dark:text-green-400" />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            <strong className="text-green-700 dark:text-green-300">Your blood request is fulfilled.</strong>{" "}
            A donation was completed for it, so it is closed. If more blood is needed, raise a new
            request from a separate profile.
          </span>
        </div>
      )}
      {bloodRequestExpired && bloodRequestClosedReason !== "fulfilled" && (
        <div className="mx-5 mt-3 rounded-md border-[1px] border-amber-500 bg-amber-50 dark:bg-amber-950/40 p-3 flex flex-wrap items-center gap-3">
          <TriangleAlert className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            <strong className="text-amber-700 dark:text-amber-300">Your blood request has expired.</strong>{" "}
            The date you needed the blood has passed. Submit a new request with a new date to contact donors again.
          </span>
          <Link
            to="/request"
            className="ml-auto px-3 py-1.5 rounded-sm bg-red-600 text-white text-sm hover:bg-red-500"
          >
            Raise a new request
          </Link>
        </div>
      )}
      <div className="min-h-svh flex max-sm:flex-col border-[1px] rounded-lg shadow-sm shadow-gray-400 mx-5 my-1 overflow-y-hidden">
        <div className="flex flex-col sm:h-[75vh] sm:w-[15vw] w-full">
          <div className="flex sm:flex-col">
            <div
              className={`text-[1rem] sm:text-[1.2rem] cursor-pointer w-full m-3 flex h-[8vh] sm:h-[18vh] items-center justify-center rounded-lg shadow-sm shadow-gray-400 transition-all duration-300 ${isAvailable ? "bg-red-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
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
              className={`text-[1rem] sm:text-[1.2rem] cursor-pointer w-full m-3 flex h-[8vh] sm:h-[18vh] items-center justify-center rounded-lg shadow-sm shadow-gray-400 transition-all duration-300 ${isPending ? "bg-red-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
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
              className={`text-[1rem] sm:text-[1.2rem] cursor-pointer w-full m-3 flex h-[8vh] sm:h-[18vh] items-center justify-center rounded-lg shadow-sm shadow-gray-400 transition-all duration-300 ${isAccepted ? "bg-red-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
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
              className={`text-[1rem] sm:text-[1.2rem] cursor-pointer w-full m-3 flex h-[8vh] sm:h-[18vh] items-center justify-center rounded-lg shadow-sm shadow-gray-400 transition-all duration-300 ${isCompleted ? "bg-red-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
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
              <motion.h1 className="font-bold text-[1.2rem] font-mono text-center flex items-center justify-center gap-2">
                <Info className="size-5 text-red-600 dark:text-red-400" /> Menu Instructions
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
                  <h2 className="flex items-center gap-2 font-bold p-3 pb-1">
                    <UserCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                    Available (Donors Ready to Donate)
                  </h2>
                  <ul className="list-disc pl-9 pr-3 pb-3 text-sm space-y-1">
                    <li>Donors are available in your selected location.</li>
                    <li>Open a donor's profile to see their details.</li>
                    <li>You can send a request directly to an available donor.</li>
                    <li>A donor marked Unavailable is already committed to somebody else.</li>
                  </ul>
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
                  <h2 className="flex items-center gap-2 font-bold p-3 pb-1">
                    <SendHorizontal className="size-4 text-amber-600 dark:text-amber-400" />
                    Request Sent (Waiting for the Donor)
                  </h2>
                  <ul className="list-disc pl-9 pr-3 pb-3 text-sm space-y-1">
                    <li>Your request has been sent to the donor.</li>
                    <li>The donor has 24 hours to accept or reject it.</li>
                    <li>Each card shows how long is left to respond.</li>
                    <li>You can withdraw a request and try another donor at any time.</li>
                  </ul>
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
                  <h2 className="flex items-center gap-2 font-bold p-3 pb-1">
                    <BadgeCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                    Accepted (Choose One Donor)
                  </h2>
                  <ul className="list-disc pl-9 pr-3 pb-3 text-sm space-y-1">
                    <li>These donors have agreed to donate for your requirement.</li>
                    <li>Confirm one of them to start the donation workflow.</li>
                    <li>
                      Confirming one closes your request to everybody else - the others are told the
                      requirement is taken, not that you rejected them.
                    </li>
                    <li>Follow safety and health guidelines before the donation.</li>
                  </ul>
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
            <DonorRow
              key={donor.donor._id}
              donor={donor}
              action={actionFor(donor)}
              onBlocked={() => setShowRecipientModal(true)}
            />
          ))}
          {isPending && !prependingRequests.length && (
            <div className="w-full h-full flex justify-center items-center">
              <span>No Pending Requests !</span>
            </div>
          )}
          {isPending &&
            prependingRequests.length > 0 &&
            prependingRequests.map((donor) => (
              <DonorRow
                key={donor.donor._id}
                donor={donor}
                action={actionFor(donor)}
                onBlocked={() => setShowRecipientModal(true)}
              />
          ))}
          {isAccepted && !acceptedDonors.length && (
            <div className="w-full h-full flex justify-center items-center">
              <span>No Accepting Donors !</span>
            </div>
          )}
          {isAccepted &&
            acceptedDonors.length > 0 &&
            acceptedDonors.map((donor) => (
              <DonorRow
                key={donor.donor._id}
                donor={donor}
                action={actionFor(donor)}
                onBlocked={() => setShowRecipientModal(true)}
              />
          ))}
          {isCompleted && !completedRequests.length && (
            <div className="w-full h-full flex justify-center items-center">
              <span>You didn't complete any requests!</span>
            </div>
          )}
          {isCompleted &&
            completedRequests.length > 0 &&
            completedRequests.map((donor) => (
              <DonorRow
                key={donor.donor._id}
                donor={donor}
                action={actionFor(donor)}
                onBlocked={() => setShowRecipientModal(true)}
              />
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default AllDonors;