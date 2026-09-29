import { create } from "zustand";
import { axiosInstance } from "../lib/axios.jsx";
import toast from "react-hot-toast";   
import { useAuthStore } from "./useAuthStore.jsx";
import emailjs from '@emailjs/browser';
import { nextDonationSuggestion } from "../lib/donationWindow.js";
import { siteLink } from "../lib/siteUrl.js";
/**
 * Socket wiring. Two rules, both learned the hard way:
 *
 * 1. Every listener is bound as off(event, handler) + on(event, handler) with a module-level
 *    handler, never off(event) with no second argument. A bare off() removes every listener for
 *    that event across the whole app, so "whichever page mounted last wins" - and the events
 *    below are shared by the recipient list, the single-recipient page, the request list and the
 *    My Blood Request view.
 * 2. A refresh has to apply its own response. The server's list broadcasts carried whole
 *    documents to every connected client and are gone; what remains are invalidation signals, so
 *    the old `fetchRecipients` pattern - await the GET, discard it, wait for the broadcast to set
 *    state - now updates nothing at all.
 */
const bindSocket = (socket, handlers)=>{
    if(!socket) return
    Object.entries(handlers).forEach(([event, handler])=>{
        socket.off(event, handler)
        socket.on(event, handler)
    })
}

// Events after which the user's own blood request may read differently: a donor moved through
// the workflow, or the request itself closed. Declared outside the store with a single stable
// handler so socket.off can match it and listeners cannot accumulate.
const MY_REQUEST_EVENTS = [
    "requestsent","confirmrequest","rejectrequest","rejectaccrequest","acceptrequest",
    "acceptanceexpired","requestexpired","donationcancelled","bloodrequestexpired",
    "bloodrequestfulfilled","bloodrequestclosed","otpverified","recipientcommitted",
    "recipientreleased","requestinprogress","bloodrequestupdated"
]
const refetchMyBloodRequest = ()=> useRecipientStore.getState().getMyBloodRequest({silent:true})

let recipientListHandlers = null
const bindRecipientList = ()=>{
    const socket = useAuthStore.getState().socket
    if(!socket) return
    if(!recipientListHandlers){
        const refresh = ()=> useRecipientStore.getState().allRecipients({silent:true})
        recipientListHandlers = {
            // Somebody's blood request closed - fulfilled or expired - so this list has an entry
            // that no longer exists. Broadcast to everyone, so it refetches silently: the
            // recipient whose own request it was is told separately by the events below.
            bloodrequestclosed:refresh,
            requestexpired:refresh,
            newrecipient:refresh,
            requestsent:refresh,
            deleterequest:refresh,
            confirmrequest:refresh,
            rejectaccrequest:refresh,
            rejectrequest:refresh,
            // a recipient committed to a donor, so their requirement leaves this directory - or
            // was released, so it comes back
            recipientcommitted:refresh,
            recipientreleased:refresh,
            // a donation that had already been agreed was called off - the blood-needed date
            // passed with the donor never completing it, or the recipient cancelled it
            donationcancelled:({reason} = {})=>{
                toast.error(reason === "expired"
                    ? "A confirmed donation was cancelled because the date the blood was needed has passed"
                    : "A confirmed donation was cancelled")
                refresh()
                useAuthStore.getState().getUser()
            },
            // this donor's request was cancelled because the recipient confirmed someone else.
            // Never phrased as a rejection: the donor did nothing wrong.
            recipientfounddonor:()=>{
                toast.error("The recipient has confirmed another donor, so your request was automatically cancelled")
                refresh()
            },
            // the acceptance deadline passed without the donation being confirmed, so both
            // sides are freed and the recipient can choose another donor
            acceptanceexpired:()=>{
                toast.error("An accepted request expired because it was not confirmed in time")
                refresh()
            },
            bloodrequestexpired:()=>{
                toast.error("Your blood request has expired. Create a new one to contact donors.")
                refresh()
                // the expired request is archived and deleted, so authUser.recipientId is gone
                useAuthStore.getState().getUser()
            },
            // the donation completed, so this request is closed for good
            bloodrequestfulfilled:()=>{
                toast.success("Your blood request is fulfilled. If more blood is needed, raise a new request from a separate profile.",{duration:10000})
                refresh()
                useAuthStore.getState().getUser()
            },
        }
    }
    bindSocket(socket, recipientListHandlers)
}

// Which recipient page is on screen, held outside the handlers so navigating between recipients
// reuses the same handler references and the targeted off() keeps matching.
let watchedRecipientId = null
let singleRecipientHandlers = null
const bindSingleRecipient = ()=>{
    const socket = useAuthStore.getState().socket
    if(!socket) return
    if(!singleRecipientHandlers){
        const refresh = ()=>{
            if(watchedRecipientId) useRecipientStore.getState().getRecipient(watchedRecipientId, {silent:true})
        }
        singleRecipientHandlers = {
            bloodrequestclosed:refresh,
            recipientfounddonor:refresh,
            acceptanceexpired:refresh,
            requestexpired:refresh,
            bloodrequestexpired:refresh,
            bloodrequestfulfilled:refresh,
            donationcancelled:refresh,
            requestsent:refresh,
            deleterequest:refresh,
            confirmrequest:refresh,
            rejectaccrequest:refresh,
            rejectrequest:refresh,
            updateProfile:refresh,
            recipientcommitted:refresh,
            recipientreleased:refresh,
            // the recipient edited the requirement this donor is looking at
            bloodrequestupdated:refresh,
        }
    }
    bindSocket(socket, singleRecipientHandlers)
}

let requestListHandlers = null
const bindRequestList = ()=>{
    const socket = useAuthStore.getState().socket
    if(!socket) return
    if(!requestListHandlers){
        const refresh = ()=> useRecipientStore.getState().allRequests({silent:true})
        requestListHandlers = {
            requestsent:refresh,
            acceptrequest:refresh,
            confirmrequest:refresh,
            confirmedrequest:refresh,
            rejectrequest:refresh,
            rejectaccrequest:refresh,
            deleterequest:refresh,
            recipientfounddonor:refresh,
            acceptanceexpired:refresh,
            requestexpired:refresh,
            donationcancelled:refresh,
            bloodrequestexpired:refresh,
            bloodrequestfulfilled:refresh,
            otpverified:refresh,
            requestinprogress:refresh,
            bloodrequestupdated:refresh,
        }
    }
    bindSocket(socket, requestListHandlers)
}

export const useRecipientStore = create((set,get)=>({
     
    recipients:[],
    recipient:{},
    // Set from the recipients directory response. Kept on the store rather than derived from the
    // request list, because a donor's lock starts the moment they accept and the list of
    // requirements is not where that is recorded.
    viewerDonorCommitted:false,
    viewerCommittedRecipientId:null,
    requests:[],
    request:{},
    OtpDetail:null,  
    isRequestsFetching:false,
    isRecipientFetching:false,
    isRecipientLoading:false,
    isRequestLoading:false,
    isSingleRequestFetching:false,
    isSendRequest:false,
    isAcceptReq:false,
    isRejectRequest:false,
    setOtpDetail:(data)=>{
        set({OtpDetail:data})
    },
    isSendingOtp:false,
    isVerifyOtp:false,
    isOtpVerified:false,

    createRecipient:async(data)=>{
        set({isCreatingRecipient:true})
        try{
            const res = await axiosInstance.post('/recipient/',data)
            set({recipients: [...get().recipients,res.data]})
            toast.success("Recipient Created successfully!")
            useAuthStore.getState().checkAuth()
            return true
        }catch(err){
            // surface the server's own message, otherwise validation errors reach the
            // user as "[object Object]"
            toast.error(err.response?.data?.message || err.message || "Could not create the request")
            return false
        }finally{
            set({isCreatingRecipient:false})
        }
    }, 
    // `silent` is what the socket refreshes pass: they must not flip the spinner back on and
    // blank the list the user is reading every time anybody anywhere sends a request.
    allRecipients: async ({silent = false} = {}) => {
        if(!silent) set({ isRecipientFetching: true });
        try {
            const res = await axiosInstance.get('/recipient/');
            const recipients = res.data.recipients.map((recipient, index) => ({
                recipient,
                recipientProfile: res.data.recipientProfile[index],
                request: res.data.requests[index]
            }));
            set({
                recipients,
                // this donor's own commitment: they may not accept a second requirement while it
                // stands, and the API refuses it, so the list shows why rather than offering a
                // button that 409s
                viewerDonorCommitted:Boolean(res.data.viewerDonorCommitted),
                viewerCommittedRecipientId:res.data.viewerCommittedRecipientId || null
            });
            bindRecipientList()
        } catch (err) {
            console.log(err.response?.data?.message || err.message);
        } finally {
            if(!silent) set({ isRecipientFetching: false });
        }
    },
    getRecipient: async (id, {silent = false} = {}) => {
        if(!id) return
        watchedRecipientId = id
        if(!silent) set({ isRecipientLoading: true });
        try {
            const res = await axiosInstance.get(`/recipient/${id}`);
            // {recipientDetail, request, recipientProfile, isInProgress}
            set({ recipient: res.data })
            bindSingleRecipient()
        } catch (err) {
            console.log(err.response?.data?.message || err.message);
        } finally {
            if(!silent) set({ isRecipientLoading: false });
        }
    },
    // The user's own blood request, for the "My Blood Request" view. A plain read: the server
    // endpoint writes nothing, so opening this page cannot disturb the expiry deadline or a
    // donor who is already confirmed.
    myBloodRequest:null,
    isMyRequestLoading:false,
    getMyBloodRequest:async({silent = false} = {})=>{
        if(!silent) set({isMyRequestLoading:true})
        try{
            const res = await axiosInstance.get('/recipient/me')
            set({myBloodRequest:res.data})
            // One stable handler reused across calls, so the targeted off() actually matches and
            // repeated visits to the page cannot stack duplicate listeners.
            const socket = useAuthStore.getState().socket
            if(socket){
                MY_REQUEST_EVENTS.forEach(event => {
                    socket.off(event, refetchMyBloodRequest)
                    socket.on(event, refetchMyBloodRequest)
                })
            }
            return res.data
        }catch(err){
            console.log(err.response?.data?.message || err.message)
            return null
        }finally{
            if(!silent) set({isMyRequestLoading:false})
        }
    },
    deleteRecipient:async()=>{
        try{
            await axiosInstance.delete('/recipient/')
        }catch(err){
            console.log(err.response.data.message)
        }
    },
    allRequests: async ({silent = false} = {}) => {
        if(!silent) set({ isRequestsFetching: true });
        try {
            const res = await axiosInstance.get('/request/');
            const requests = (res.data.requests || []).map((request, index) => ({
                request,
                donorProfile: res.data.donorProfile[index],
                recipientProfile: res.data.recipientProfile[index]
            }));
            set({ requests });
            // Used to be a bare socket.off("requestsent") followed by an untargeted on(), which
            // removed the recipient list's and the My Blood Request view's listeners for the same
            // event - so whichever page mounted last was the only one that still updated.
            bindRequestList()
        } catch (err) {
            console.log(err.response?.data?.message || err.message);
        } finally {
            if(!silent) set({ isRequestsFetching: false });
        }
    },
    getRequest: async (id, {silent = false} = {}) => {
        if(!silent) set({ isRequestLoading: true });
        try {
            const res = await axiosInstance.get(`/request/${id}`);
            set({ request: res.data})
        } catch (err) {
            console.log(err.response?.data?.message || err.message);
        } finally {
            if(!silent) set({ isRequestLoading: false });
        }
    },
    sendRequest: async (id,donorId) => {
        set({ isSendRequest: true });
        try{
            const authUser = useAuthStore.getState().authUser;
            const publicKey = `2ch3fjaTj2-SImD0t`

            // The request is created first so the backend can refuse it - a duplicate for the
            // same blood requirement, an expired request, this recipient already being committed
            // to another donor, the donor's own profile - before a donor is emailed about a
            // request that does not exist.
            try{
                const res = await axiosInstance.post(`/request/${id}`)
                set({requests:[...get().requests, res.data]})
            }catch(err){
                // the server explains exactly why: duplicate, expired, committed or self-matched
                toast.error(err.response?.data?.message || "Could not send the request")
                return false
            }

            // Fetched only now, and in this order deliberately. Contact details are no longer on
            // the public profile response - a donor's email address is returned only to somebody
            // who has a live request with them - and creating the request above is what makes this
            // client one of those. Fetching first would hand back a profile with no email on it.
            let emailParams = null
            try{
                const donor = await axiosInstance.get(`/donate/${donorId}`);
                const recipient = await axiosInstance.get(`/recipient/${authUser.recipientId}`);
                const recipientDetail = recipient.data.recipientDetail;
                const hospital = recipientDetail?.hospitalInfo?.trim();
                emailParams = {
                    donor: donor.data.donorDetail?.username,
                    recipient: recipientDetail?.AttendeesName,
                    email: donor.data.donorDetail?.email,
                    message: recipientDetail?.note,
                    link: siteLink(`/allrequests/${recipientDetail?._id}`),
                };
                if (hospital) {
                    emailParams.hospital = hospital;
                    emailParams.hospital_name = hospital;
                }
            }catch(err){
                console.log(err)
            }

            try{
                if(!emailParams?.email) throw new Error("no donor email address available")
                await emailjs.send("service_zi6mag1","template_uxd4tem",emailParams,publicKey)
                toast.success("Request sent Successfully!")
            }catch(err){
                console.log(err)
                // the request itself is saved, so this is only about the notification email
                toast.success("Request sent, but the notification email could not be delivered")
            }
            return true
        }catch(err){
            console.log(err.response?.data?.message || err.message)
            toast.error(err.response?.data?.message || "something went wrong !")
            return false
        }finally{
            set({isSendRequest:false})
        }
    },
    
    acceptRequest:async(id)=>{
        set({isAcceptReq:true})
        try{
            const res = await axiosInstance.put(`/request/${id}`)
            set({ request: res.data})
            toast.success("Request Accepted Successfully !")
            return true
        }catch(err){
            // the server explains why an acceptance was refused - already committed to
            // another recipient, donor form missing - so show its message, not a generic one
            toast.error(err.response?.data?.message || "something went wrong !")
            return false
        }finally{
            set({isAcceptReq:false})
        }
    },
    confirmRequest:async(id)=>{
        set({isAcceptReq:true})
        try{
            const res = await axiosInstance.put(`/request/${id}/confirm`)
            set({ request: res.data})
            toast.success("Donor confirmed Successfully !")
            return true
        }catch(err){
            // the server explains why a confirmation was refused - a donor is already
            // confirmed for this request - so show its message, not a generic one
            toast.error(err.response?.data?.message || "something went wrong !")
            return false
        }finally{
            set({isAcceptReq:false})
        }
    },
    confirmedRequest:async(id)=>{
        set({isAcceptReq:true})
        try{ 
            const res = await axiosInstance.put(`/request/${id}/confirmed`) 
            set({ request: res.data}) 
            toast.success("Donor confirmed Successfully !")
        }catch(err){
            console.log(err.response.data.message)
            toast.error("something went wrong !")
        }finally{
            set({isAcceptReq:false})
        }
    },
    rejectRequest:async(id)=>{
        set({isRejectRequest:true})
        try{ 
            const res = await axiosInstance.put(`/request/${id}/reject`) 
            set({ request: res.data}) 
            toast.success("Request Rejected !")
        }catch(err){
            console.log(err.response.data.message)
            toast.error("something went wrong !")
        }finally{
            set({isRejectRequest:false})
        }
    },
    rejectAcceptedRequest:async(id)=>{
        set({isRejectRequest:true})
        try{ 
            const res = await axiosInstance.put(`/request/${id}/rejected`) 
            set({request:res.data})
            toast.success("Request Rejected !")
        }catch(err){
            console.log(err.response.data.message)
            toast.error("something went wrong !")
        }finally{
            set({isRejectRequest:false})
        }
    },
    // the recipient calls off a donation they had already confirmed, because the donor went
    // quiet or cannot donate after all. Both commitment locks are released on the server, so
    // the recipient is free to approach another donor straight away.
    isCancellingRequest:false,
    cancelConfirmedRequest:async(id)=>{
        set({isCancellingRequest:true})
        try{
            const res = await axiosInstance.put(`/request/${id}/cancel`)
            toast.success(res.data?.message || "The donation was cancelled")
            await useAuthStore.getState().getUser()
            return true
        }catch(err){
            // the server explains why: already completed, already cancelled, not the recipient
            toast.error(err.response?.data?.message || "Could not cancel the donation")
            return false
        }finally{
            set({isCancellingRequest:false})
        }
    },
    deleteRequest:async(id)=>{
        try{
            await axiosInstance.delete(`/request/${id}`)
            toast.success("Request Deleted")
        }catch(err){
            console.log(err.response.data.message)
            toast.error(err.message)
        }
    },
    completedRequests:async()=>{
        
    },
    sendOtp:async(id,data)=>{
        set({isSendingOtp:true})
        try{
            const publicKey = `2ch3fjaTj2-SImD0t`
            const res = await axiosInstance.post(`/otp/${id}/send`,data) 
            set({OtpDetail:res.data.otpDetail})
            emailjs.send(
                "service_zi6mag1",        
                "template_v9a9dwu",       
                {
                    OTP_CODE: res.data.otpDetail, 
                    email: res.data.email
                },
                publicKey      
                )
                .then(async() => {
                    toast.success("OTP sent to the Email !")
                })
                .catch((err) => {
                    console.log(err)
                    toast.error("something went wrong !")
            });  
            
        }catch(err){
            console.log(err)
            toast.error("something went wrong !")
        }finally{
            set({isSendingOtp:false})
        }
    },
    verifyOtp:async(id,data)=>{
        set({isVerifyOtp:true}) 
        try{  
            const res = await axiosInstance.post(`/otp/${id}/verifyotp`,data) 
            if(res.data.status === "VERIFIED"){
                set({isOtpVerified:true,OtpDetail:null})
                toast.success("otp verified")
                // the donation is now recorded, so refresh authUser for the donation count,
                // the availability switch that the server just turned off, and the
                // estimated next donation date shown on the profile
                await useAuthStore.getState().getUser()
                if(res.data.nextDonationDate){
                    toast.success(nextDonationSuggestion(res.data.nextDonationDate),{duration:12000})
                }
            }else if(res.data.status === "PENDING"){
                set({isOtpVerified:false})  
                toast.error("otp Incorrect") 
            }else if(res.data.status === "EXPIRED"){
                set({isOtpVerified:false,OtpDetail:null})  
                toast.error("otp Expired! Send again!") 
            } 
        }catch(err){
            set({isOtpVerified:false})
            console.log(err)
            toast.error("something went wrong !")
        }finally{
            set({isVerifyOtp:false})
        }
    },
}))