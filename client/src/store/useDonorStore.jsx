import { create } from "zustand";
import { axiosInstance } from "../lib/axios.jsx";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore.jsx";

/**
 * Socket wiring, and why it looks like this.
 *
 * The server no longer broadcasts list payloads. `allDonors`, `getDonor`, `allrecipients` and
 * `getrecipient` used to carry whole documents - including a requestDetails array computed for one
 * caller only - to every connected client, so one user's page could be overwritten with another
 * user's request states, and every donor's medical answers went out with it. They are gone; the
 * remaining events are invalidation signals and the store re-reads its own authenticated response.
 *
 * That means a refetch has to actually apply its result. The old code called a `fetchDonors` helper
 * that awaited the GET and threw the response away, relying on the broadcast to arrive and set
 * state - so with the broadcasts removed every one of those refreshes silently did nothing.
 *
 * Handlers are module-level singletons for the same reason. `socket.off("acceptrequest")` with no
 * handler argument removes *everybody's* listener for that event, so whichever page mounted last
 * won and the other store's handler was gone for the rest of the session. Every binding below is
 * off(event, handler) + on(event, handler) with a stable reference, which is idempotent and touches
 * nothing but itself.
 */
const bindSocket = (socket, handlers)=>{
    if(!socket) return
    Object.entries(handlers).forEach(([event, handler])=>{
        socket.off(event, handler)
        socket.on(event, handler)
    })
}

let listHandlers = null
const bindDonorList = (socket, get)=>{
    if(!socket) return
    if(!listHandlers){
        const refresh = ()=> get().allDonors({silent:true})
        listHandlers = {
            // a donor committing elsewhere, or being freed, changes what this list may offer
            donorunavailable:refresh,
            donoravailable:refresh,
            // an expired acceptance or request disappears from these lists
            acceptanceexpired:refresh,
            requestexpired:refresh,
            bloodrequestfulfilled:refresh,
            // some requirement closed somewhere; silent refetch, the owner hears about it below
            bloodrequestclosed:refresh,
            donationcancelled:refresh,
            acceptrequest:refresh,
            confirmedrequest:refresh,
            confirmrequest:refresh,
            rejectrequest:refresh,
            rejectaccrequest:refresh,
            updateProfile:refresh,
            newdonor:refresh,
            otpverified:refresh,
            // a recipient confirmed a donor, or released one: this decides whether Send Request is
            // offered at all, so the list has to know
            recipientcommitted:refresh,
            recipientreleased:refresh,
            requestinprogress:refresh,
            bloodrequestexpired:()=>{
                toast.error("Your blood request has expired because the date the blood was needed has passed. Submit a new request with a new date.",{duration:10000})
                refresh()
                // the expired request is archived and deleted, so authUser.recipientId is gone
                // and the user counts as a non-recipient again until they raise a new request
                useAuthStore.getState().getUser()
            },
        }
    }
    bindSocket(socket, listHandlers)
}

// Which donor profile is on screen. Held outside the handlers so navigating from one donor to
// another does not need a new handler object - which could not then be unbound by reference.
let watchedDonorId = null
let singleHandlers = null
const bindSingleDonor = (socket, get)=>{
    if(!socket) return
    if(!singleHandlers){
        const refresh = ()=>{
            if(watchedDonorId) get().getDonor(watchedDonorId, {silent:true})
        }
        singleHandlers = {
            donorunavailable:refresh,
            donoravailable:refresh,
            acceptanceexpired:refresh,
            requestexpired:refresh,
            bloodrequestfulfilled:refresh,
            bloodrequestexpired:refresh,
            bloodrequestclosed:refresh,
            donationcancelled:refresh,
            acceptrequest:refresh,
            confirmedrequest:refresh,
            confirmrequest:refresh,
            rejectrequest:refresh,
            rejectaccrequest:refresh,
            updateProfile:refresh,
            newdonor:refresh,
            otpverified:refresh,
            recipientcommitted:refresh,
            recipientreleased:refresh,
            requestinprogress:refresh,
        }
    }
    bindSocket(socket, singleHandlers)
}

export const useDonorStore = create((set,get)=>({

    isCreatingDonor:false,
    isDonorFetching:false,
    isDonorLoading:false,
    singleDonor:{},
    donors:[],
    // true when this user's own blood request is finished, so the directory shows a banner
    // instead of Send/Confirm. The reason beside it is "fulfilled" or "expired", because the
    // two need opposite copy: one is a success, the other a prompt to raise a new request.
    bloodRequestExpired:false,
    bloodRequestClosedReason:null,
    // true once this user has confirmed a donor: they are committed to that donation and may not
    // contact anybody else until it completes or is cancelled. The API refuses it either way -
    // this is so the UI can say why rather than let the user click into a 409.
    viewerCommitted:false,
    viewerCommittedDonorId:null,
    socket:useAuthStore.getState().socket,

    createDonor:async(data)=>{
        set({isCreatingDonor:true})
        try{
            const res = await axiosInstance.post('/donate/',data)
            set({donors:[...get().donors, res.data]})
            // the server links User.donorId on first submission, so authUser has to be
            // refetched for the "complete your donor form" warning to clear right away
            await useAuthStore.getState().getUser()
            toast.success("thanks donor!")
            return true
        }catch(err){
            toast.error(err.response?.data?.message || err.message || "Could not submit the donor form")
            return false
        }finally{
            set({isCreatingDonor:false})
        }
    },
    // `silent` is set by the socket refreshes: they must not flip the spinner back on and blank
    // the list the user is reading every time anybody anywhere accepts a request.
    allDonors:async({silent = false} = {})=>{
        if(!silent) set({isDonorFetching:true})
        try{
            const res = await axiosInstance.get('/donate/')
            const donorList = res.data.donors.map((donor, index) => ({
                donor,
                donorDetail: res.data.donorDetails[index],
                requestDetail:res.data.requestDetails[index]
            }));
            set({
                donors:donorList,
                bloodRequestExpired:Boolean(res.data.bloodRequestExpired),
                bloodRequestClosedReason:res.data.bloodRequestClosedReason || null,
                viewerCommitted:Boolean(res.data.viewerCommitted),
                viewerCommittedDonorId:res.data.viewerCommittedDonorId || null
            })
            bindDonorList(useAuthStore.getState().socket, get)
        }catch(err){
            console.log(err.response?.data?.message || err.message)
        }finally{
            if(!silent) set({isDonorFetching:false})
        }

    },
    getDonor:async(id, {silent = false} = {})=>{
        if(!id) return
        watchedDonorId = id
        if(!silent) set({isDonorLoading:true})
        try{
            const res  = await axiosInstance.get(`/donate/${id}`)
            set({singleDonor:res.data})
            bindSingleDonor(useAuthStore.getState().socket, get)
        }catch(err){
            console.log(err.response?.data?.message || err.message)
        }finally{
            if(!silent) set({isDonorLoading:false})
        }
    },
    deleteDonor:async()=>{
        try{
            await axiosInstance.delete('/donate/')
        }catch(err){
            console.log(err.response?.data?.message || err.message)
        }
    }
}))
