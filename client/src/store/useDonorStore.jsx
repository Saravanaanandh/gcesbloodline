import { create } from "zustand";
import { axiosInstance } from "../lib/axios.jsx";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore.jsx";
import { Socket } from "socket.io-client";

export const useDonorStore = create((set,get)=>({

    isCreatingDonor:false,
    isDonorFetching:false,
    isDonorLoading:false,
    singleDonor:{},
    donors:[],
    socket:useAuthStore.getState().socket,

    createDonor:async(data)=>{
        set({isCreatingDonor:true})
        try{ 
            const res = await axiosInstance.post('/donate/',data) 
            set({donors:[...get().donors, res.data]})
            toast.success("thanks donor!")
        }catch(err){ 
            toast.error(err.response.data.message)
        }finally{
            set({isCreatingDonor:false})
        }
    },
    allDonors:async()=>{
        set({isDonorFetching:true})
        try{
            const fetchDonors = async()=>{
                await axiosInstance.get('/donate/')
            }
            const res = await axiosInstance.get('/donate/')  
            const donorList = res.data.donors.map((donor, index) => ({
                donor,
                donorDetail: res.data.donorDetails[index],
                requestDetail:res.data.requestDetails[index]
            }));
            set({donors:donorList}) 
            const socket = useAuthStore.getState().socket
            socket.off("allDonors")
            socket.off("newdonor")
            socket.off("updateProfile") 
            socket.off("acceptrequest") 
            socket.off("confirmedrequest") 
            socket.off("rejectrequest") 
            socket.off("rejectaccrequest") 
            socket.off("otpverified") 

            socket.on("acceptrequest",fetchDonors)
            socket.on("confirmedrequest",fetchDonors)
            socket.on("confirmrequest",fetchDonors)
            socket.on("rejectrequest",fetchDonors)
            socket.on("rejectaccrequest",fetchDonors)
            socket.on("updateProfile",fetchDonors)  
            socket.on("newdonor",fetchDonors)   
            socket.on("otpverified",fetchDonors)   
            socket.on("allDonors",({donors,requestDetails,donorDetails})=>{
                // const donors = [donors] 
                const donorList =  donors.map((donor, index) => ({
                    donor,
                    donorDetail:  donorDetails[index],
                    requestDetail: requestDetails[index]
                }));
                set({donors:donorList})  
            }) 
        }catch(err){
            console.log(err.response.data.message)
        }finally{
            set({isDonorFetching:false}) 
        }

    },
    getDonor:async(id)=>{
        set({isDonorLoading:true})
        try{
            const fetchDonor = async(id)=>{
                await axiosInstance.get(`/donate/${id}`) 
            }
            const res  = await axiosInstance.get(`/donate/${id}`)  
            set({singleDonor:res.data})
            const socket = useAuthStore.getState().socket
            socket.off("getDonor")
            socket.off("newdonor")
            socket.off("updateProfile") 
            socket.off("acceptrequest") 
            socket.off("confirmedrequest") 
            socket.off("rejectrequest") 
            socket.off("rejectaccrequest") 
            socket.off("otpverified") 

            socket.on("acceptrequest",()=>fetchDonor(id))
            socket.on("confirmedrequest",()=>fetchDonor(id))
            socket.on("confirmrequest",()=>fetchDonor(id))
            socket.on("rejectrequest",()=>fetchDonor(id))
            socket.on("rejectaccrequest",()=>fetchDonor(id))
            socket.on("updateProfile",()=>fetchDonor(id))  
            socket.on("newdonor",()=>fetchDonor(id))   
            socket.on("otpverified",()=>fetchDonor(id))

            socket.on("getDonor",({donor,donorDetail, requestDetail})=>{
                set({singleDonor:{donor ,donorDetail , requestDetail }}) 
            })  
        }catch(err){ 
            console.log(err)
        }finally{ 
            set({isDonorLoading:false})
        }
    },
    deleteDonor:async()=>{
        try{
            await axiosInstance.delete('/donate/')
        }catch(err){
            console.log(err.response.data.message)
        }
    }
}))