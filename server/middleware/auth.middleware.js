import jwt from 'jsonwebtoken'
import User from './../model/User.js'

export const verifyJWT = async(req, res, next)=>{
    if(!req.cookies?.jwt) return res.status(401).json({message:"unauthorized user"})

    const token = req.cookies.jwt

    if(!token) return res.status(401).json({message:"forbidden"})

    const payload = jwt.verify(
        token,
        process.env.JWT_SECRET,
    ) 
    const userId = payload.userId 
    const user = await User.findOne({_id:userId})

    if(!user) return res.status(401).json({message:"unauthorized user"})
    req.user = user
    next() 
}

