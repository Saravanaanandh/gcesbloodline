import mongoose from 'mongoose'

// Transactions need a replica set or mongos. Production Mongo (Atlas) has one; a plain
// local `mongodb://localhost:27017` does not, and there it fails with one of these.
const UNSUPPORTED = [
    "Transaction numbers are only allowed on a replica set member or mongos",
    "Transactions are not supported",
    "This MongoDB deployment does not support retryable writes",
]

const isUnsupported = (err)=>
    err?.codeName === "IllegalOperation" ||
    err?.code === 20 ||
    UNSUPPORTED.some(text => String(err?.message || "").includes(text))

let transactionsSupported = null

/**
 * Runs fn inside a transaction, passing the session so callers can attach it to their
 * queries. If the deployment cannot do transactions, fn is re-run once with a null session
 * so a standalone dev database keeps working. Every caller is written so that correctness
 * still rests on an atomic conditional update; the transaction only widens that guarantee
 * across documents.
 */
export const withTransaction = async (fn)=>{
    if(transactionsSupported === false) return await fn(null)

    let session
    try{
        session = await mongoose.startSession()
        let result
        await session.withTransaction(async ()=>{ result = await fn(session) })
        transactionsSupported = true
        return result
    }catch(err){
        if(isUnsupported(err)){
            transactionsSupported = false
            console.log("MongoDB deployment does not support transactions, falling back to atomic single-document updates")
            return await fn(null)
        }
        throw err
    }finally{
        if(session) await session.endSession()
    }
}

// Mongoose ignores a null session, so query options can be built unconditionally.
export const inSession = (session)=> session ? {session} : {}
