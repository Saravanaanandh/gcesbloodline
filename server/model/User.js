import mongoose from 'mongoose'
import bcrypt, { genSalt } from 'bcryptjs'
import jwt from 'jsonwebtoken'
 

const userSchema = new mongoose.Schema({ 
    username:{
        type:String,
        required:true,
        maxlength:30 
    },
    age:{
        type:Number,
        required:true 
    },
    gender:{
        type:String,
        enum:["MALE","FEMALE"],
        set:value => value.toUpperCase(),
        required:true 
    },
    bloodType:{
        type:String,
        required:true,
        enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-',"A1+", "A1-", "A2+", "A2-", "A1B+","A1B-", "A2B+", "A2B-", "BOMBAY BLOOD GROUP"],
        set: value => value.toUpperCase() 
    },
    location:{
        type:String,
        required:true 
    },
    pinCode:{
        type:Number,
        length:6,
        required:true 
    },
    mobile:{
        type:Number,
        required:true,
        length:10 
    },
    email:{
        type:String,
        required:true,
        match:/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        unique:true  
    },
    password:{
        type:String,
        required:true,
        minlength:6 
    },
    donation:{
        type:Number,
        default:0 
    },
    available:{
        type:Boolean, 
        default:false 
    },
    weight:{
        type:Number,
        default:0
    },
    profile:{
        type:String,
        dafault:"" 
    },
    banner:{
        type:String,
        dafault:"" 
    },
    tattooIn12:{
        type:Boolean,
        dafault:false 
    },
    positiveHIVTest:{
        type:Boolean,
        dafault:false 
    },
    lastDonated:{
        type:String 
    },
    nextDonationDate:{
        type:String 
    },
    recipientId:{
        type:mongoose.Types.ObjectId  
    },
    donorId:{
        type:mongoose.Types.ObjectId  
    },
    token:String
},{timestamps:true})

userSchema.pre('save',async function(next){ 
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
})

userSchema.methods.createJWT = function(){
    return jwt.sign({
            userId:this._id
        },
        process.env.JWT_SECRET,
        {expiresIn:'30d'}
    )
}

userSchema.methods.comparePassword = async function(candidatePassword){
    const isMatchPassword = await bcrypt.compare(candidatePassword, this.password)
    return isMatchPassword
}

const User = mongoose.model('User',userSchema)

export default User