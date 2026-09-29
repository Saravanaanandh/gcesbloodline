import {create} from 'zustand'
import { axiosInstance } from '../lib/axios.jsx'
import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import emailjs from '@emailjs/browser'

// Stable handler references, bound with off(event, handler) + on(event, handler). A bare
// socket.off("newdonor") - which is what this store used to do - removes every listener for that
// event across the whole app, including the donor and recipient stores' own. Since checkAuth runs
// once at boot and never again, anything it lost that way stayed lost for the rest of the session.
let authHandlers = null
const bindAuthSocket = (socket)=>{
    if(!socket) return
    if(!authHandlers){
        const refresh = ()=> useAuthStore.getState().getUser()
        authHandlers = {
            // donorId / recipientId are set server-side, so the local authUser is stale until
            // it is re-read - this is what clears the "complete your donor form" warning
            newdonor:refresh,
            newrecipient:refresh,
            checkAuth:(user)=>{
                if(!user) return
                useAuthStore.setState({
                    authUser:user,
                    isUserAsDonor:Boolean(user.donorId),
                    isUserAsRecipient:Boolean(user.recipientId)
                })
            },
            // Now an id-only signal: the broadcast used to carry the whole updated user document,
            // which meant every client in the app received every other user's email address,
            // phone number and health answers whenever anybody saved their profile.
            updateProfile:({userId} = {})=>{
                if(userId && String(userId) === String(useAuthStore.getState().authUser?._id)) refresh()
            },
        }
    }
    Object.entries(authHandlers).forEach(([event, handler])=>{
        socket.off(event, handler)
        socket.on(event, handler)
    })
}

// Socket.io needs the server root, not a path.  Same hostname-following logic as
// axios.jsx: VITE_API_URL overrides, otherwise port 5000 on the same host as the
// browser, so both localhost and LAN access work without touching any file.
const getSocketURL = () => {
    if (import.meta.env.MODE !== "development") return "/"
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
    return `http://${window.location.hostname}:5000`
}
const BASE_URL = getSocketURL()
export const useAuthStore = create((set,get)=>({

    authUser:null,
    users:[],  
    isSignUp:false,
    isLogin:false,
    isLogout:false,
    isCheckAuth:true,
    isUserLoading:false,
    isUserAsRecipient: false,
    isUserAsDonor: false,
    socket:null,
    otpSent:false,
    otpVerified:false,
    isOtpsending:false,
    isOtpVerifing:false,
    
    checkAuth:async()=>{
        try{
            const res = await axiosInstance.get('/auth/check-auth')
            set({
                authUser:res.data,
                isUserAsDonor:Boolean(res.data.donorId),
                isUserAsRecipient:Boolean(res.data.recipientId)
            })
            // connect first, then bind: there is no socket to bind to until getConnected has run
            get().getConnected()
            bindAuthSocket(get().socket)
        }catch{
            set({authUser:null})
        }finally{
            set({isCheckAuth:false})
        }
    },

    // ---------------------------------------------------------------------
    // Signup with email verification.
    //
    // The account does not exist until the code is verified, so there is nothing to log in as
    // between these two steps - no authUser, no cookie. What the client holds instead is an opaque
    // ticket standing for the pending signup; the form itself stays on the server, so changing the
    // email address or waiting for a resend never asks the user to type anything again.
    //
    // The code is never in any of these responses. It only ever exists in the email.
    // ---------------------------------------------------------------------
    signupTicket:null,
    signupEmail:null,
    signupEmailDelivery:null,
    signupCooldownSeconds:45,
    isVerifyingSignupOtp:false,
    isResendingSignupOtp:false,
    isChangingSignupEmail:false,

    // Clears the pending signup, so the UI goes back to the form. Called when the server says the
    // verification session is gone (`restart`), and when the user abandons the screen.
    resetSignup:()=>set({signupTicket:null, signupEmail:null, signupEmailDelivery:null}),

    startSignup:async(data)=>{
        set({isSignUp:true})
        try{
            const res = await axiosInstance.post('/auth/signup',data)
            set({
                signupTicket:res.data.ticket,
                signupEmail:res.data.email,
                signupEmailDelivery:res.data.emailDelivery,
                signupCooldownSeconds:res.data.resendCooldownSeconds || 45
            })
            if(res.data.emailDelivery === 'sent'){
                toast.success(`Verification code sent to ${res.data.email}`)
            }
            return true
        }catch(err){
            toast.error(err.response?.data?.message || err.message || "Signup failed")
            return false
        }finally{
            set({isSignUp:false})
        }
    },

    verifySignupOtp:async(otp)=>{
        const ticket = get().signupTicket
        if(!ticket) return false
        set({isVerifyingSignupOtp:true})
        try{
            const res = await axiosInstance.post('/auth/signup/verify-otp',{ticket, otp})
            // verification succeeded, so the server has created the account and set the cookie
            set({
                authUser:res.data,
                isUserAsDonor:Boolean(res.data.donorId),
                isUserAsRecipient:Boolean(res.data.recipientId),
                signupTicket:null,
                signupEmail:null,
                signupEmailDelivery:null
            })
            get().getConnected()
            bindAuthSocket(get().socket)
            toast.success("Email verified. Welcome to GCES Blood Line!")
            return true
        }catch(err){
            if(err.response?.data?.restart) get().resetSignup()
            toast.error(err.response?.data?.message || err.message || "Could not verify the code")
            return false
        }finally{
            set({isVerifyingSignupOtp:false})
        }
    },

    resendSignupOtp:async()=>{
        const ticket = get().signupTicket
        if(!ticket) return false
        set({isResendingSignupOtp:true})
        try{
            const res = await axiosInstance.post('/auth/signup/resend-otp',{ticket})
            set({
                signupEmailDelivery:res.data.emailDelivery,
                signupCooldownSeconds:res.data.resendCooldownSeconds || 45
            })
            toast.success(res.data.message || "A new code has been sent")
            return true
        }catch(err){
            if(err.response?.data?.restart) get().resetSignup()
            toast.error(err.response?.data?.message || err.message || "Could not send a new code")
            return false
        }finally{
            set({isResendingSignupOtp:false})
        }
    },

    changeSignupEmail:async(email)=>{
        const ticket = get().signupTicket
        if(!ticket) return false
        set({isChangingSignupEmail:true})
        try{
            const res = await axiosInstance.post('/auth/signup/change-email',{ticket, email})
            // the previous code is dead the moment this succeeds - the server replaced it
            set({
                signupEmail:res.data.email,
                signupEmailDelivery:res.data.emailDelivery,
                signupCooldownSeconds:res.data.resendCooldownSeconds || 45
            })
            toast.success(res.data.message || `A verification code has been sent to ${res.data.email}`)
            return true
        }catch(err){
            if(err.response?.data?.restart) get().resetSignup()
            toast.error(err.response?.data?.message || err.message || "Could not change the email address")
            return false
        }finally{
            set({isChangingSignupEmail:false})
        }
    },
    login:async(data)=>{
        set({isLogin:true})
        try{
            const res = await axiosInstance.post('/auth/login',data)
            const isRecipient = res.data.recipientId ? true : false
            const isDonor = res.data.donorId ? true : false
            set({authUser:res.data, isUserAsDonor: isDonor, isUserAsRecipient: isRecipient})
            get().getConnected()
            bindAuthSocket(get().socket)
            toast.success("logged in successfully!")
            return true
        }catch(err){
            toast.error(err.response?.data?.message || err.message || "Login failed")
            return false
        }finally{
            set({isLogin:false})
        }
    },

    logout:async()=>{
        set({isLogout:true})
        try{
            await axiosInstance.delete('/auth/logout')
            get().disConnected()
            set({authUser:null, isUserAsDonor: false, isUserAsRecipient: false}) 
        }catch(err){
            toast.error(err.message)
            set({authUser:null, isUserAsDonor: false, isUserAsRecipient: false}) 
        }finally{
            set({isLogout:false})
        }
    },
    updateProfile:async(data)=>{
        set({isProfileUpdating:true})
        try{
            const res = await axiosInstance.put('/auth/update-profile', data)
            const isRecipient = res.data.recipientId ? true : false
            const isDonor = res.data.donorId ? true : false
            set({authUser:res.data, isUserAsDonor: isDonor, isUserAsRecipient: isRecipient})
            // The listener lives in bindAuthSocket now. It used to be torn down with a bare
            // off("updateProfile") and rebuilt here on every save, which took the donor and
            // recipient stores' listeners for the same event down with it.
            bindAuthSocket(get().socket)
            toast.success("Profile updated successfully")
            return res.data
        }catch(err){ 
            toast.error(err.response?.data?.message || err.message || "Failed to update profile")
            throw err
        }finally{
            set({isProfileUpdating:false})
        }
    }, 
    getUser:async()=>{
        set({isGetUser:true})
        try{
            const res = await axiosInstance.get('/auth/')  
            const isRecipient = res.data.recipientId ? true : false
            const isDonor = res.data.donorId ? true : false
            set({authUser:res.data, isUserAsDonor: isDonor, isUserAsRecipient: isRecipient})  
        }catch{
            // do not reset authUser to null immediately if checkAuth succeeded
        }finally{
            set({isGetUser:false})
        }
    },
    getConnected:()=>{
        const {authUser} = get()

        if(!authUser || get().socket?.connected) return;

        const socket = io(BASE_URL, { 
            transports: ["websocket","polling"],  
            withCredentials:true,
            query:{
                userId: get().authUser._id
            }
        })
        socket.connect()
        set({socket:socket}) 
        
    },
    disConnected:()=>{
        if(get().socket?.connected){
            get().socket.disconnect()
        } 
    },
    sendOTPForPasswordReset:async(email)=>{
        set({otpSent:false})
        set({isOtpsending:true})
        try{
            const res = await axiosInstance.post('/auth/forget-password/send-otp',{email});
            const publicKey = `0rGRpnE7N0ygcnPTj`
            emailjs.send(
                "service_ra38cer",        
                "template_yrnw2dn",       
                {
                    OTP_CODE: res.data.otp, 
                    email: res.data.email
                },
                publicKey      
                )
                .then(async() => {  
                    set({otpSent:true})
                    toast.success("OTP sent to the Email !") 
                })
                .catch(() => {
                    set({otpSent:false})
                    toast.error("something went wrong !") 
            });  
            toast.success("OTP sent to your email")
        }catch(err){ 
            set({otpSent:false})
            toast.error(err.response.data.message)
        }finally{
            set({isOtpsending:false})
        }
    },
    verifyOTPForPasswordReset:async(email, otp)=>{
        set({otpVerified:false})
        set({isOtpVerifing:true})
        try{
            await axiosInstance.post('/auth/forget-password/verify-otp',{email, otp});
            set({otpVerified:true})
            toast.success("OTP verified successfully")
        }catch(err){
            set({otpVerified:false}) 
            toast.error(err.response.data.message)
        }finally{
            set({isOtpVerifing:false})
        }
    },
    resetPassword:async(email, password)=>{
        try{
            await axiosInstance.post('/auth/forget-password/reset-password',{email, password});
            toast.success("password reset successfully")
        }catch(err){ 
            toast.error(err.response.data.message)
        }
    }
}))
