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
    place:{
        type:String,
        default:"",
        trim:true,
        maxlength:100
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
    // A User document is only created once the signup OTP has been verified, so this is true for
    // every account the current flow produces. Defaulted to true rather than false on purpose:
    // accounts that predate email verification are already trusted, and defaulting to false
    // would retroactively lock all of them out.
    emailVerified:{
        type:Boolean,
        default:true
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
    // Only hash when the password actually changed. This hook used to run on every save() - so
    // any save that touched an unrelated field re-hashed the stored hash and locked the account
    // out of its own password. Password resets still work: assigning a new value marks the path
    // modified, which is exactly the condition below.
    if(!this.isModified('password')) return next()

    // The signup verification flow bcrypt-hashes the password when the form is submitted and
    // holds only that hash while the user verifies their email, so by the time the User document
    // is created the value is already a hash and must not be hashed a second time. Set on the
    // document being saved, never taken from request data.
    if(this.$locals.passwordAlreadyHashed) return next()

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