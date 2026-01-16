import { useState } from "react"
import { Link } from "react-router"
import toast from "react-hot-toast"
import { useAuthStore } from "../store/useAuthStore.jsx"
import loginImg from './../assets/loginbg2.gif'
import { Eye, EyeOff } from "lucide-react"

const Login = () => {
    
    const {login} = useAuthStore()
    const [formData,setFormDate] = useState({
        email:"",
        password:""
    }) 
    const [showPassword, setShowPassword] = useState(false)
    const handleSubmit = async(e)=>{
        e.preventDefault()

        if(!formData.email || !formData.password) return toast.error("please fill the required fields!")
        try{
            await login(formData) 
        }catch(err){
            console.log(err.message)
            toast.error("something went wrong, try again later"+err.message)
        }
        setFormDate({
            email:"",
            password:""
        })
    }

    return (
      <div className="w-dvw h-[100vh] overflow-y-scroll overflow-x-hidden">
        {/* <div className="relative bg-fixed"> 
            <img className="w-[100vw] min-h-[100vh] absolute -z-10 object-cover bg-center bg-fixed " src={loginImg} alt="" />
        </div> */}
        <div className="relative">
            <div
                className="absolute bg-fixed w-full h-[100vh] bg-cover bg-center -z-10"
                style={{ backgroundImage: `url(${loginImg})` }}
            >
            </div> 
        </div>
        <form onSubmit={handleSubmit} className="h-screen flex items-center justify-center my-0 max-sm:my-0">
            <div className="dark:text-black flex flex-col items-center gap-5 min-h-auto w-[80vw] sm:w-[40vw] bg-[#0000003e]  border-2 border-black  py-10 rounded-2xl max-sm:py-5 backdrop-blur-[10px]">
            <h1 className="sm:text-[2rem] text-white"><strong>Access Account</strong></h1>
            <input 
                type="email" 
                className="bg-gray-300 sm:w-[30vw] w-[80%] outline-none border-none p-2 rounded-md"
                placeholder="Email"
                value={formData.email}
                onChange={(e)=> setFormDate({...formData, email:e.target.value})}
                autoComplete="on"
                required
            />
            <div className="relative flex justify-between items-center max-sm:w-[80%]">

                <input 
                    className="bg-gray-300 max-sm:w-full sm:w-[30vw] outline-none border-none p-2 rounded-md"
                    type={showPassword ? "text":"password"}
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => setFormDate({ ...formData, password:e.target.value })}
                    required
                />
                <div className="absolute right-3 cursor-pointer" onClick={()=>{setShowPassword(!showPassword)}}>
                {
                    showPassword ? 
                    <Eye className="size-4"/> : <EyeOff className="size-4"/>
                }
                </div>
            </div>
            <div className="sm:w-[30vw] w-[80%] text-center">

                <button className="cursor-pointer w-full text-nowrap border-[1px] border-violet-800 rounded-md px-2 py-1 sm:px-5 sm:py-2.5 bg-violet-900 text-white transition-all duration-300 hover:scale-105"  type="submit" onClick={handleSubmit} disabled={!formData.email || !formData.password}>
                    Log In
                </button>
                <div className="mt-5">
                    <strong className="text-white"><p>don&rsquo;t have an account ? <Link className="text-violet-800 underline" to='/signup'>Sign up</Link>
                    </p>
                    </strong>
                </div>
            </div>
            </div>
        </form>
      </div>
    )
  }
  
  export default Login