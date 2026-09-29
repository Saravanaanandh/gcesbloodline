import { Link } from "react-router";
import { useRecipientStore } from "../store/useRecipientStore.jsx";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  CalendarDays,
  CheckCheck,
  Droplets,
  Hospital,
  Info,
  MapPin,
  Siren,
} from "lucide-react";
import profilePic from "./../assets/user.png";
import { useAuthStore } from "../store/useAuthStore.jsx";
import FormRequiredModal from "../components/FormRequiredModal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { recipientAction } from "../lib/requestStatus.js";
import { formatBloodNeededDate } from "../lib/bloodNeededDate.js";
import { formatTimeLeft } from "../lib/deadline.js";

/**
 * One row for one blood requirement, in every tab.
 *
 * The mirror of DonorRow in AllDonors: the four tabs each carried their own copy of this markup
 * and decided the button text inline, so "Waiting" was yellow in one tab and the same state was a
 * green "Confirm" in another. The pill and the chip both come from recipientAction now.
 */
const RequestRow = ({ item, action, onBlocked }) => {
  const profile = item.recipientProfile || {};
  const detail = item.recipient || {};
  const ActionIcon = action.Icon;
  const showEmergency = detail.isCritical && item.request?.status !== "finalState";

  return (
    <Link
      to={`/allrequests/${item.recipient._id}`}
      className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md hover:border-red-300 dark:hover:border-red-500/50 transition-all"
    >
      <img
        className="size-12 sm:size-14 rounded-full object-cover ring-2 ring-neutral-100 dark:ring-neutral-800 shrink-0 self-start sm:self-auto"
        src={profile.profile || profilePic}
        alt={profile.username || "Recipient"}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold text-neutral-900 dark:text-white truncate">
            {profile.username || "Recipient"}
          </h2>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold">
            <Droplets className="size-3 fill-current" /> {detail.bloodType || "--"}
          </span>
          {showEmergency && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-bold uppercase tracking-wide">
              <Siren className="size-3" /> Emergency
            </span>
          )}
        </div>
        <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{detail.patientsage ? `${detail.patientsage} years` : "Age not set"}</span>
          <span>{detail.gender || "Gender not set"}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" /> {detail.location || "Location not set"}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" /> {formatBloodNeededDate(detail.reqDate)}
          </span>
        </p>
        {detail.hospitalInfo?.trim() && (
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 inline-flex items-center gap-1 max-w-full truncate">
            <Hospital className="size-3.5 shrink-0" /> {detail.hospitalInfo.trim()}
          </p>
        )}
        {/* an unanswered request expires on its own, so the donor can see how long is left */}
        {item.request?.respondBy && (
          <p className="mt-1 text-[0.7rem] font-semibold text-amber-600 dark:text-amber-400">
            {formatTimeLeft(item.request.respondBy)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
        <StatusBadge meta={action} size="sm" />
        <button
          type="button"
          onClick={(e) => {
            // The row itself is the link. This chip only intercepts when there is something to
            // say first - no donor form yet - and otherwise lets the navigation through.
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

const AllRequests = () => {
  const {
    recipients, allRecipients, viewerDonorCommitted, viewerCommittedRecipientId
  } = useRecipientStore();
  const { isUserAsDonor } = useAuthStore();
  const [isRecipients, setIsRecipients] = useState(false);
  const [isRequests, setIsRequests] = useState(false);
  const [isAcceptedRequests, setIsAcceptedRequests] = useState(false);
  const [isCompletedRequest, setIsCompletedRequests] = useState(false);
  const [showDonorModal, setShowDonorModal] = useState(false);

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

  /**
   * What this donor may do about one requirement.
   *
   * `viewerDonorCommitted` is this donor's own lock, which starts the moment they accept somebody
   * - the backend's atomic claim on Donor.committedRequestId is what actually refuses a second
   * acceptance, so every other row has to say "Locked" rather than offer an Accept that 409s.
   */
  const actionFor = (item) => {
    const detail = item.recipient || {};
    const requestClosed = Boolean(
      detail.isFulfilled || detail.isExpired ||
      (detail.expiresAt && new Date(detail.expiresAt) <= new Date())
    );
    return recipientAction({
      status: item.request?.status,
      viewerIsDonor: isUserAsDonor,
      donorCommitted: viewerDonorCommitted,
      committedToThisRecipient: Boolean(
        viewerCommittedRecipientId && detail.recipientId &&
        String(viewerCommittedRecipientId) === String(detail.recipientId)
      ),
      requestClosed,
    });
  };

  return (
    <div>
      <FormRequiredModal
        isOpen={showDonorModal}
        onClose={() => setShowDonorModal(false)}
        userType="donor"
      />
      <Navbar />
      <h1 className="text-center text-red-600 text-[1.2rem] underline">
        <strong>All Requests</strong>
      </h1>
      <div className="min-h-svh flex max-sm:flex-col border-[1px] rounded-lg shadow-sm shadow-gray-400 mx-5 my-1 overflow-y-hidden">
        <div className="flex flex-col sm:h-[75vh] sm:w-[15vw] w-full">
          <div className="flex sm:flex-col">
            <div
              className={`text-[1rem] sm:text-[1.2rem] cursor-pointer w-full m-3 flex h-[8vh] sm:h-[18vh] items-center justify-center rounded-lg shadow-sm shadow-gray-400 transition-all duration-300 ${isRecipients ? "bg-red-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
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
              className={`text-[1rem] sm:text-[1.2rem] cursor-pointer w-full m-3 flex h-[8vh] sm:h-[18vh] items-center justify-center rounded-lg shadow-sm shadow-gray-400 transition-all duration-300 ${isRequests ? "bg-red-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
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
              className={`text-[1rem] sm:text-[1.2rem] cursor-pointer w-full m-3 flex h-[8vh] sm:h-[18vh] items-center justify-center rounded-lg shadow-sm shadow-gray-400 transition-all duration-300 ${isAcceptedRequests ? "bg-red-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
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
              className={`text-[1rem] sm:text-[1.2rem] cursor-pointer w-full m-3 flex h-[8vh] sm:h-[18vh] items-center justify-center rounded-lg shadow-sm shadow-gray-400 transition-all duration-300 ${isCompletedRequest ? "bg-red-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
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
                    <Droplets className="size-4 text-red-600 dark:text-red-400" />
                    Recipients (People Who Need Blood)
                  </h2>
                  <ul className="list-disc pl-9 pr-3 pb-3 text-sm space-y-1">
                    <li>These are the active blood requirements you can help with.</li>
                    <li>Open one to see the patient details and the date the blood is needed.</li>
                    <li>Accept a request to commit to that requirement.</li>
                    <li>
                      A requirement disappears from this list once its recipient has confirmed a
                      donor.
                    </li>
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
                    <CheckCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                    Accepted (Waiting and Confirming)
                  </h2>
                  <ul className="list-disc pl-9 pr-3 pb-3 text-sm space-y-1">
                    <li>
                      <b>Waiting</b> means you have accepted and the recipient is choosing between
                      the donors who accepted.
                    </li>
                    <li>
                      <b>In Progress</b> means the recipient picked you - confirm the donation to
                      carry on.
                    </li>
                    <li>
                      While you are committed you cannot accept another requirement. Cancel this one
                      first if you need to.
                    </li>
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
                    Confirmed (Complete the Donation)
                  </h2>
                  <ul className="list-disc pl-9 pr-3 pb-3 text-sm space-y-1">
                    <li>Both sides have confirmed, so the donation is going ahead.</li>
                    <li>Generate the OTP at the donation centre to record the donation.</li>
                    <li>Contact the recipient to agree on a time and place.</li>
                    <li>Follow safety and health guidelines before donating.</li>
                  </ul>
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
              <RequestRow
                key={recipient.recipient._id}
                item={recipient}
                action={actionFor(recipient)}
                onBlocked={() => setShowDonorModal(true)}
              />
          ))}
          {isRequests && !prependingRequests.length && (
            <div className="w-full h-full flex justify-center items-center">
              <span>No Requests !</span>
            </div>
          )}
          {isRequests &&
            prependingRequests.length > 0 &&
            prependingRequests.map((recipient) => (
              <RequestRow
                key={recipient.recipient._id}
                item={recipient}
                action={actionFor(recipient)}
                onBlocked={() => setShowDonorModal(true)}
              />
          ))}
          {isAcceptedRequests && !acceptedrequests.length && (
            <div className="w-full h-full flex justify-center items-center">
              <span> No confirmed Requests!</span>
            </div>
          )}
          {isAcceptedRequests &&
            acceptedrequests.length > 0 &&
            acceptedrequests.map((recipient) => (
              <RequestRow
                key={recipient.recipient._id}
                item={recipient}
                action={actionFor(recipient)}
                onBlocked={() => setShowDonorModal(true)}
              />
            ))}
          {isCompletedRequest && !completedRequests.length && (
            <div className="w-full h-full flex justify-center items-center">
              <span>No History of completed Requests!</span>
            </div>
          )}
          {isCompletedRequest &&
            completedRequests.length > 0 &&
            completedRequests.map((recipient) => (
              <RequestRow
                key={recipient.recipient._id}
                item={recipient}
                action={actionFor(recipient)}
                onBlocked={() => setShowDonorModal(true)}
              />
            ))}
        </motion.div>
      </div>
    </div>
  );
};

export default AllRequests;
