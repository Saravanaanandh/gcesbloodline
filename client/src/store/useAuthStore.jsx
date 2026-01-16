import {create} from 'zustand'
import { axiosInstance } from '../lib/axios.jsx'
import toast from 'react-hot-toast' 
import { io } from 'socket.io-client'

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5000" : "/"  
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

    checkAuth:async()=>{ 
        try{
            const check = async()=>{
                await axiosInstance.get('/auth/check-auth') 
            }
            const res = await axiosInstance.get('/auth/check-auth')
            const isRecipient = res.data.recipientId ? true : false
            const isDonor = res.data.donorId ? true : false 
            set({authUser:res.data, isUserAsDonor: isDonor, isUserAsRecipient:isRecipient})  
            const socket = get().socket
            socket?.off("newrecipient")
            socket?.off("newdonor")
            socket?.off("checkAuth")
            socket?.on("newdonor",check)
            socket?.on("newrecipient",check)
            socket?.on("checkAuth",(user)=>{
                const isRecipient = user.recipientId ? true : false
                const isDonor = user.donorId ? true : false 
                set({authUser:user,isUserAsDonor: isDonor, isUserAsRecipient:isRecipient})
            }) 
            get().getConnected()
        }catch(err){
            console.log(err.response.data.message) 
            set({authUser:null})
        }finally{
            set({isCheckAuth:false})
        }
    },

    signup:async(data)=>{
        set({isSignUp:true})
        try{ 
            const res = await axiosInstance.post('/auth/signup',data)
            set({authUser:res.data})
            set({users:[...get().users, res.data]})
            get().getConnected()
            toast.success("signed up successfully") 
        }catch(err){ 
            toast.error(err.response.data.message)
        }finally{
            set({isSignUp:false})
        }
    },
    login:async(data)=>{
        set({isLogin:true})
        try{
            const res = await axiosInstance.post('/auth/login',data)
            set({authUser:res.data})
            get().getConnected()
            toast.success("logged in successfully!")  
        }catch(err){
            toast.error(err.response.data.message)
        }finally{
            set({isLogin:false})
        }
    },

    logout:async()=>{
        set({isLogout:true})
        try{
            await axiosInstance.delete('/auth/logout')
            get().disConnected()
            set({authUser:null}) 
        }catch(err){
            toast.error(err.message)
        }finally{
            set({isLogout:false})
        }
    },
    updateProfile:async(data)=>{
        set({isProfileUpdating:true})
        try{ 
            const socket = get().socket
            socket.off("updateProfile")
            const res = await axiosInstance.put('/auth/update-profile', data)
            set({authUser:res.data}) 
            socket.on("updateProfile",(updatedDetail)=>{ 
                if(get().authUser._id == updatedDetail._id){
                    set({authUser:updatedDetail}) 
                }
            })
            toast.success("profile Updated") 
            // socket.on("completedRequest",async(requestDetail)=>{
            //     console.log("request Detail: "+requestDetail)
            //     await axiosInstance.put('/auth/update-profile', data)
            // })
        }catch(err){
            console.log(err)
            toast.error(err.response.data.message)
        }finally{
            set({isProfileUpdating:false})
        }
    }, 
    getUser:async()=>{
        set({isGetUser:true})
        try{
            const res = await axiosInstance.get('/auth/')  
            set({authUser:res.data}) 
            // const socket = useAuthStore.getState().socket
            // socket.off("newrecipient")
            // socket.off("getProfile")
            // socket.on("getProfile",(profile)=>{
            //     set({authUser:profile})
            // })
            // socket.on("newrecipient",async()=>{
            //     await axiosInstance.get('/auth/')
            // })
        }catch(err){
            console.log(err)
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
    }
}))
