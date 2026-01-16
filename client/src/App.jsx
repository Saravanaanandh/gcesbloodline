import { Navigate, Route, Routes } from 'react-router'
import './App.css'
import Home from './pages/Home.jsx'
import LearnMore from './pages/LearnMore.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import UpdateProfile from './pages/UpdateProfile.jsx'
import { useAuthStore } from './store/useAuthStore.jsx'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import Donate from './pages/Donate.jsx'
import Request from './pages/Request.jsx'
import AllRequests from './pages/AllRequests.jsx'
import AllDonors from './pages/AllDonors.jsx'
import SingleRequest from './pages/SingleRequest.jsx'
import SingleDonor from './pages/SingleDonor.jsx'
import Loading from './components/Loading.jsx'
import OtpPage from './pages/OtpPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import RequestForMe from './pages/RequestForMe.jsx' 

function App() { 
  const {authUser, checkAuth,isCheckAuth} = useAuthStore()
  
  useEffect(()=>{
    checkAuth()
  },[checkAuth])

  if(isCheckAuth && !authUser){
    return (<Loading/>)
  }
  return (
    <div className='max-w-screen'>
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/learnmore' element={<LearnMore/>}/>
        <Route path='/dashboard' element={<Dashboard/>}/>
        <Route path='/login' element={!authUser ? <Login/> : <Navigate to={'/'}/>}/>
        <Route path='/signup' element={!authUser ? <Signup/> : <Navigate to={'/'}/>}/> 
        <Route path='/profile' element={authUser ? <UpdateProfile/>:<Navigate to={'/'}/>}/> 
        <Route path='/donate' element={authUser ? <Donate/>:<Navigate to={'/'}/>}/> 
        <Route path='/request' element={authUser ? <Request/>:<Navigate to={'/'}/>}/> 
        <Route path='/requestme' element={authUser ? <RequestForMe/>:<Navigate to={'/'}/>}/> 
        <Route path='/allrequests' element={authUser ? <AllRequests/>:<Navigate to={'/'}/>}/> 
        <Route path='/allrequests/:id' element={authUser ? <SingleRequest/>:<Navigate to={'/'}/>}/> 
        <Route path='/alldonors' element={authUser ? <AllDonors/>:<Navigate to={'/'}/>}/> 
        <Route path='/alldonors/:id' element={authUser ? <SingleDonor/>:<Navigate to={'/'}/>}/> 
        <Route path='/:id/otp' element={authUser ? <OtpPage/> :<Navigate to={'/'}/>}/>
      </Routes>
      <Toaster/>
    </div>
  )
}

export default App
