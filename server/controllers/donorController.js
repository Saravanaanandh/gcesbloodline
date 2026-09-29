import { io } from '../config/socket.js'
import Requests from '../model/Request.js'
import Donor from './../model/Donar.js'
import User from './../model/User.js'
import { bloodRequestClosedReason, findRecipientCommitment } from '../utils/requestWorkflow.js'
import { publicDonor, publicUser, viewerTier } from '../utils/publicView.js'


export const createDonor = async (req, res)=>{
    const {_id:userId} = req.user 
    if(!userId) return res.status(401).json({message:"unauthorized user"})

    try{
        const existingDonor = await Donor.findOne({donorId:userId})
        if(existingDonor){
            const updatedDonor = await Donor.findOneAndUpdate({donorId:userId},{...req.body},{new:true})
            // Ids only. The donor document is almost entirely medical answers - the eligibility
            // questionnaire - and this used to broadcast all of them to every connected client.
            // It has only ever been a "reload the donor list" signal, so that is all it carries.
            io.emit("newdonor",{donorId:userId, donorRecordId:updatedDonor._id})
            res.status(201).json(updatedDonor)
        }else{
            const donor = await Donor.create({...req.body,donorId:userId})
            await User.findByIdAndUpdate(userId, {donorId:donor._id,available:true},{new:true})
            io.emit("newdonor",{donorId:userId, donorRecordId:donor._id})
            res.status(201).json(donor)
        }
    }catch(err){
        if(err.name === "ValidationError"){
            return res.status(400).json({message:"please provide the valid details"})
        }
        res.status(500).json({message:err.name})
    }
}

export const getAllDonars = async(req, res)=>{

    const {_id:userId} = req.user  
    if(!userId) return res.status(401).json({message:"unauthorized user"})

    const donors = await Donor.find({donorId :{$ne: userId, $exists:true}})
    const profiles = await Promise.all(
        donors.map(donor => User.findOne({ _id: donor.donorId }))
    )

    // The viewer's own relationship with each donor, loaded regardless of whether their blood
    // request is still open: it decides whether they may see that donor's contact details, and
    // that does not stop being true because their request expired an hour ago.
    const relationships = await Promise.all(
        donors.map(donor => Requests.findOne({donorId:donor.donorId,recipientId:userId}))
    )
    const tiers = donors.map((donor, index) => viewerTier(userId, donor.donorId, relationships[index]))

    // A recipient whose blood request is finished - fulfilled, or past its needed-by date - has
    // no live requests left. The sweeper deletes them, but it runs on an interval, so they are
    // suppressed here too; otherwise the directory would keep offering Confirm on a dead request.
    const closedReason = await bloodRequestClosedReason(userId)
    const bloodRequestExpired = Boolean(closedReason)
    const requestDetails = bloodRequestExpired ? donors.map(()=> null) : relationships

    // The viewer's own commitment. Once they have confirmed a donor they may not contact anybody
    // else until that donation finishes or is cancelled, so the list is told to render Send
    // Request as unavailable. The API refuses it regardless - this is only so the UI can explain
    // itself rather than let the user click into a 409.
    const commitment = await findRecipientCommitment(userId)

    // Dropped the io.emit("allDonors", ...) that used to fire here. It reached every connected
    // client carrying a requestDetails array computed for this caller alone, so one recipient's
    // request states could overwrite another's list - and it shipped every donor's eligibility
    // answers along with it. Callers now read their own response.
    res.status(200).json({
        donors:donors.map((donor, index) => publicDonor(donor, tiers[index])),
        donorDetails:profiles.map((profile, index) => publicUser(profile, tiers[index])),
        requestDetails,
        bloodRequestExpired,
        bloodRequestClosedReason:closedReason,
        viewerCommitted:Boolean(commitment),
        viewerCommittedDonorId:commitment ? commitment.donorId : null,
        count:donors.length
    })
}

export const getDonar = async (req, res)=>{
    const {_id:userId} = req.user 
    const {id:donorId} = req.params

    if(!userId) return res.status(401).json({message:"unauthorized user"})
    if(!donorId) return res.status(400).json({message:"donar id not valid"})

    try{
        const donor = await Donor.findById(donorId)
        if(!donor) return res.status(404).json({message:"donar not found"})

        // findById, not findOne(donor.donorId) - the old call passed an ObjectId where a filter
        // object belongs, and had no projection, so this endpoint returned the donor's bcrypt
        // password hash to anybody who opened their profile page.
        const profile = await User.findById(donor.donorId)

        const relationship = await Requests.findOne({donorId:donor.donorId,recipientId:userId})
        const tier = viewerTier(userId, donor.donorId, relationship)

        const closedReason = await bloodRequestClosedReason(userId)
        const bloodRequestExpired = Boolean(closedReason)
        const requestDetail = bloodRequestExpired ? null : relationship

        // The viewer's own commitment, so the profile can show why Send Request is unavailable.
        const commitment = await findRecipientCommitment(userId)

        // Dropped the io.emit("getDonor", ...) that used to fire here - opening one donor's
        // profile pushed that donor's record, and the viewer's own request state, to every
        // connected client.
        res.status(200).json({
            donor:publicDonor(donor, tier),
            donorDetail:publicUser(profile, tier),
            requestDetail,
            bloodRequestExpired,
            bloodRequestClosedReason:closedReason,
            viewerCommitted:Boolean(commitment),
            viewerCommittedDonorId:commitment ? commitment.donorId : null
        })
    }catch(err){
        if(err.name === "CastError"){
            return res.status(404).json({message:"donar not found"})
        }
        res.status(500).json({message:err.message})
    }
}

export const deleteDonar = async (req, res)=>{
    const {_id:userId} = req.user   
    if(!userId) return res.status(400).json({message:"unauthorized user"}) 
    try{
        const donor = await Donor.findOne({donorId:userId})
        if(!donor) return res.status(404).json({message:"You're not a donor"})
        await Donor.findOneAndDelete({donorId:userId}) 
        await User.findByIdAndUpdate(userId,{ $unset: { donorId: "" } })
        res.status(200).json({message:"Donor was deleted"}) 
    }catch(err){ 
        res.status(400).json({message:err})   
    }   
}
