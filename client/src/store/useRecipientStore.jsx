import { create } from "zustand";
import { axiosInstance } from "../lib/axios.jsx";
import toast from "react-hot-toast";   
import { useAuthStore } from "./useAuthStore.jsx";
import emailjs from '@emailjs/browser';
export const useRecipientStore = create((set,get)=>({
     
    recipients:[],
    recipient:{},
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
        }catch(err){
            console.log(err.response.data.message)
            toast.error(err) 
        }finally{
            set({isCreatingRecipient:false})
        }
    }, 
    allRecipients: async () => {
        set({ isRecipientFetching: true });
        try {
            const fetchRecipients = async()=>{await axiosInstance.get('/recipient/')}
            const res = await axiosInstance.get('/recipient/'); 
            const recipients = res.data.recipients.map((recipient, index) => ({
                recipient,
                recipientProfile: res.data.recipientProfile[index],
                request: res.data.requests[index]
            })); 
            set({recipients});
            const socket = useAuthStore.getState().socket
            socket.off("newrecipient")
            socket.off("allrecipients")
            socket.off("requestsent")
            socket.off("deleterequest")
            socket.off("confirmrequest")
            socket.off("rejectaccrequest")
            socket.off("rejectrequest")
 
            socket.on("newrecipient", fetchRecipients)
            socket.on("requestsent",fetchRecipients)
            socket.on("deleterequest",fetchRecipients)
            socket.on("confirmrequest",fetchRecipients) 
            socket.on("rejectaccrequest",fetchRecipients)
            socket.on("rejectrequest",fetchRecipients)

            socket.on("allrecipients",({recipients,recipientProfile,requests})=>{
                const recipientAll = recipients.map((recipient, index) => ({
                    recipient,
                    recipientProfile:  recipientProfile[index],
                    request:  requests[index]
                })); 
                set({recipients:recipientAll}); 
            })
    
        } catch (err) {
            console.log(err);
        } finally {
            set({ isRecipientFetching: false });
        }
    }, 
    getRecipient: async (id) => {
        set({ isRecipientLoading: true });
        try { 
            const fetchRecipient = async(id)=>  {
                await axiosInstance.get(`/recipient/${id}`) 
            }
            const res = await axiosInstance.get(`/recipient/${id}`); 
            set({ recipient: res.data })  //{recipientDetail,request,recipientProfile}
            const socket = useAuthStore.getState().socket
            socket.off("getrecipient")  
            socket.off("updateProfile")  
            socket.off("requestsent")
            socket.off("deleterequest")
            socket.off("confirmrequest")
            socket.off("rejectaccrequest")
            socket.off("rejectrequest")
  
            socket.on("requestsent",()=>fetchRecipient(id))
            socket.on("deleterequest",()=>fetchRecipient(id))
            socket.on("confirmrequest",()=>fetchRecipient(id)) 
            socket.on("rejectaccrequest",()=>fetchRecipient(id))
            socket.on("rejectrequest",()=>fetchRecipient(id))
            socket.on("updateProfile",()=>fetchRecipient(id))
            
            socket.on("getrecipient",({recipientDetail,request,recipientProfile})=>{
                set({recipient:{recipientDetail,request,recipientProfile}})
            }) 
             
        } catch (err) {
            console.log(err);
        } finally {
            set({ isRecipientLoading: false });
        }
    },
    deleteRecipient:async()=>{
        try{
            await axiosInstance.delete('/recipient/')
        }catch(err){
            console.log(err.response.data.message)
        }
    },
    allRequests: async () => {
        set({ isRequestsFetching: true });
        try {
            
            const socket = useAuthStore.getState().socket
            socket.off("requestsent")
            const res = await axiosInstance.get('/request/'); 
            const requests = res.data.requests.map((request, index) => ({
                request,
                donorProfile: res.data.donorProfile[index],
                recipientProfile: res.data.recipientProfile[index]
            })); 
            set({ requests });   
            socket.on("requestsent",async()=>{
                get().allRequests()
                return;
            })
        } catch (err) {
            console.log(err.response?.data?.message || err);
        } finally {
            set({ isRequestsFetching: false });
        }
    },
    getRequest: async (id) => {
        set({ isRequestLoading: true });
        try { 
            const res = await axiosInstance.get(`/request/${id}`); 
            set({ request: res.data})  
        } catch (err) {
            console.log(err);
        } finally {
            set({ isRequestLoading: false });
        }
    },
    sendRequest: async (id,donorId) => {
        set({ isSendRequest: true }); 
        try{
            const authUser = useAuthStore.getState().authUser;
            const publicKey = `2ch3fjaTj2-SImD0t`
            const donor = await axiosInstance.get(`/donate/${donorId}`); 
            const recipient = await axiosInstance.get(`/recipient/${authUser.recipientId}`);
             
            const redirectPage = `https://gcesbloodline.onrender.com/allrequests/${recipient.data.recipientDetail._id}`
            
            emailjs.send(
                "service_zi6mag1",        
                "template_uxd4tem",       
                {
                    donor: donor.data.donorDetail.username,
                    recipient: recipient.data.recipientDetail.AttendeesName,
                    email: recipient.data.recipientDetail.email,
                    message: recipient.data.recipientDetail.note,
                    link: redirectPage,
                },
                publicKey      
                )
                .then(async() => {
                    const res = await axiosInstance.post(`/request/${id}`); 
                    console.log(res)
                    set({requests:[...get().requests, res.data]})
                    toast.success("Request sent Successfully!")  
                })
                .catch((err) => {
                    console.log(err);
                    toast.error("Something went wrong, try again later!");
            });  
        }catch(err){
            console.log(err.response.data.message)
            toast.error("something went wrong !")
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
        }catch(err){
            console.log(err.response.data.message)
            toast.error("something went wrong !")
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
        }catch(err){
            console.log(err.response.data.message)
            toast.error("something went wrong !")
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