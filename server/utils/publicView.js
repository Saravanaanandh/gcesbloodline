/**
 * Projections for everything that leaves the server about somebody other than the caller.
 *
 * The rule the app needs, in three tiers:
 *
 *   own      - the subject looking at themselves. Everything.
 *   related  - the other party in a live request. Contact details, because they have to be able
 *              to ring each other to arrange a donation, but still no medical answers.
 *   public   - anybody else browsing a directory. Neither.
 *
 * Medical and eligibility answers are never in the "related" tier. A recipient coordinating a
 * donation needs the donor's phone number; they have no business knowing the donor's HIV test
 * result, weight, or whether they had a tattoo last year. Those exist so the *donor* can judge
 * their own eligibility, and the donor form already gates on them server-side.
 *
 * Masking is done by building the response object field by field rather than by deleting keys off
 * a Mongoose document. Deleting is how these leaks happen: a field added to a schema later is
 * public by default under a blocklist, and private by default under this allowlist.
 */

// Answers from the donor eligibility form and the health questions on the profile. Sensitive
// medical information; never leaves the account that owns it.
const DONOR_MEDICAL_FIELDS = ['lastSixmonthActivity', 'donatePre']
const USER_MEDICAL_FIELDS = ['tattooIn12', 'positiveHIVTest', 'weight']

const toPlain = (doc)=> !doc ? null : (typeof doc.toObject === 'function' ? doc.toObject() : {...doc})

/**
 * A user profile as somebody else may see it.
 *
 * `tier` is 'own' | 'related' | 'public'. Note that `password` and `token` are absent from every
 * tier including 'own' - the signup and login handlers return the raw document and therefore leak
 * the bcrypt hash, but nothing that goes through here should.
 */
export const publicUser = (doc, tier = 'public')=>{
    const user = toPlain(doc)
    if(!user) return null

    const view = {
        _id:user._id,
        username:user.username,
        age:user.age,
        gender:user.gender,
        bloodType:user.bloodType,
        location:user.location,
        place:user.place,
        pinCode:user.pinCode,
        profile:user.profile,
        banner:user.banner,
        donation:user.donation,
        available:user.available,
        // Donation dates are shown on the public donor card already and are not medical answers,
        // just "when can this person donate again" - which is the whole point of the directory.
        lastDonated:user.lastDonated,
        nextDonationDate:user.nextDonationDate,
        // presence flags only, so the client can still branch on "is this person a donor"
        isDonor:Boolean(user.donorId),
        isRecipient:Boolean(user.recipientId),
        createdAt:user.createdAt,
    }

    if(tier === 'own' || tier === 'related'){
        view.email = user.email
        view.mobile = user.mobile
    }

    if(tier === 'own'){
        view.donorId = user.donorId
        view.recipientId = user.recipientId
        for(const field of USER_MEDICAL_FIELDS) view[field] = user[field]
    }

    return view
}

/**
 * A blood request (ReqBlood document) as somebody else may see it.
 *
 * The attendee's phone number and the contact email are the private fields here: they are how a
 * donor reaches the family, so a donor with a live request gets them and a stranger browsing the
 * directory does not. The client already masked both in the UI, but masking in the UI while
 * sending the real values means the data is one devtools tab away.
 *
 * `confirmedRequestId` is dropped below the 'own' tier because it is a lock, not information, and
 * `isDonorFinded` is kept: the directory has to be able to show that a requirement is already
 * being served.
 */
export const publicBloodRequest = (doc, tier = 'public')=>{
    const request = toPlain(doc)
    if(!request) return null

    const view = {
        _id:request._id,
        recipientId:request.recipientId,
        bloodType:request.bloodType,
        patientsName:request.patientsName,
        patientsage:request.patientsage,
        gender:request.gender,
        AttendeesName:request.AttendeesName,
        location:request.location,
        place:request.place,
        pinCode:request.pinCode,
        reqDate:request.reqDate,
        bloodUnits:request.bloodUnits,
        hospitalInfo:request.hospitalInfo,
        note:request.note,
        isCritical:request.isCritical,
        isDonorFinded:request.isDonorFinded,
        isFulfilled:request.isFulfilled,
        isExpired:request.isExpired,
        expiresAt:request.expiresAt,
        createdAt:request.createdAt,
    }

    if(tier === 'own' || tier === 'related'){
        view.AttendeesPhno = request.AttendeesPhno
        view.email = request.email
    }

    if(tier === 'own'){
        view.confirmedRequestId = request.confirmedRequestId
        view.fulfilledAt = request.fulfilledAt
        view.fulfilledBy = request.fulfilledBy
        view.cycle = request.cycle
    }

    return view
}

/**
 * A donor record (Donor document) as somebody else may see it.
 *
 * Everything on this model except the commitment lock is a medical answer, so the public tier is
 * almost empty by design. `isCommitted` is derived instead of exposing committedRequestId: the
 * directory needs to know the donor is taken, not which request took them - that would tell one
 * recipient about another recipient's donation.
 */
export const publicDonor = (doc, tier = 'public')=>{
    const donor = toPlain(doc)
    if(!donor) return null

    const view = {
        _id:donor._id,
        donorId:donor.donorId,
        isCommitted:Boolean(donor.committedRequestId),
        createdAt:donor.createdAt,
        updatedAt:donor.updatedAt,
    }

    if(tier === 'own'){
        view.committedRequestId = donor.committedRequestId
        for(const field of DONOR_MEDICAL_FIELDS) view[field] = donor[field]
    }

    return view
}

/**
 * Which tier a viewer gets for a subject. `relationship` is any truthy value standing for "there
 * is a live request between these two" - the caller has usually just loaded it anyway.
 */
export const viewerTier = (viewerId, subjectId, relationship = null)=>{
    if(viewerId && subjectId && String(viewerId) === String(subjectId)) return 'own'
    if(relationship) return 'related'
    return 'public'
}
