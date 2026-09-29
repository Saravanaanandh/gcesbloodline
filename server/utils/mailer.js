import nodemailer from 'nodemailer'

/**
 * Backend-controlled email delivery.
 *
 * The app's existing email path is client-side EmailJS, which cannot be used for either of the
 * two things that now need email:
 *
 *   - Automatic cancellation notices fire from the expiry sweeper (jobs/expiry.js), where there
 *     is no browser attached to hand the send off to.
 *   - Signup verification OTPs must never reach the frontend in plaintext, and EmailJS by
 *     definition requires exactly that.
 *
 * So delivery lives here instead. Two transports are supported because the project already has
 * both libraries installed; whichever credential is present wins:
 *
 *   RESEND_API_KEY                -> Resend HTTP API   (preferred: no SMTP ports to unblock)
 *   USER_ACCOUNT + PASSWORD       -> Gmail SMTP        (a Google "app password", not the login)
 *   neither                       -> disabled, every send is skipped and logged once
 *
 * Nothing here ever throws. A send failure must not roll back a database transition that has
 * already happened - a donor who misses an email is a lesser problem than a request stuck
 * half-cancelled - so every function resolves to a result object and the caller decides whether
 * to care. That is also why `sendMail` is never awaited inside a lock-holding critical section.
 */

const FROM = process.env.MAIL_FROM || 'GCES Blood Line <onboarding@resend.dev>'

// Resolved once, lazily, on the first send. Kept in a module-level slot rather than built at
// import time so that a missing credential does not crash the server at boot.
let transport = null
let warned = false

const resolveTransport = async ()=>{
    if(transport) return transport

    if(process.env.RESEND_API_KEY){
        // imported dynamically so a deployment without the credential never loads the SDK
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        transport = {
            kind:'resend',
            send: async ({to, subject, text, html})=>{
                const { error } = await resend.emails.send({from:FROM, to:[to], subject, text, html})
                if(error) throw new Error(error.message || 'resend rejected the message')
            }
        }
        return transport
    }

    if(process.env.USER_ACCOUNT && process.env.PASSWORD){
        const mailer = nodemailer.createTransport({
            service:'gmail',
            auth:{user:process.env.USER_ACCOUNT, pass:process.env.PASSWORD}
        })
        transport = {
            kind:'gmail',
            send: ({to, subject, text, html})=> mailer.sendMail({from:FROM, to, subject, text, html})
        }
        return transport
    }

    transport = {kind:'disabled', send: async ()=>{}}
    return transport
}

export const isMailConfigured = ()=>
    Boolean(process.env.RESEND_API_KEY || (process.env.USER_ACCOUNT && process.env.PASSWORD))

/**
 * Sends one message. Resolves to {ok:true} on success, {ok:false, skipped:true} when no
 * transport is configured, {ok:false, error} when the transport rejected it. Never rejects.
 */
export const sendMail = async ({to, subject, text, html})=>{
    if(!to) return {ok:false, error:'no recipient address'}

    try{
        const active = await resolveTransport()
        if(active.kind === 'disabled'){
            // logged once per process, not once per send, so a long expiry sweep does not
            // bury the rest of the log in the same warning
            if(!warned){
                warned = true
                console.warn('[mailer] no email credential configured - set RESEND_API_KEY or USER_ACCOUNT/PASSWORD in server/.env. Emails are being skipped.')
            }
            return {ok:false, skipped:true}
        }
        await active.send({to, subject, text, html})
        return {ok:true}
    }catch(err){
        console.error(`[mailer] failed to send "${subject}" to ${to}:`, err?.message || err)
        return {ok:false, error:err?.message || 'send failed'}
    }
}

// Shared chrome so every message the server sends looks like it came from the same product.
// Inline styles only: email clients strip <style> blocks and do not support CSS variables.
const layout = (heading, bodyHtml)=>`
<div style="font-family:Segoe UI,Helvetica,Arial,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;border-radius:16px;overflow:hidden">
    <div style="background:#dc2626;padding:20px 28px">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.2px">GCES Blood Line</h1>
    </div>
    <div style="padding:28px">
      <h2 style="margin:0 0 16px;color:#171717;font-size:17px;font-weight:700">${heading}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:16px 28px;background:#fafafa;border-top:1px solid #eeeeee">
      <p style="margin:0;color:#737373;font-size:12px">This is an automated message from GCES Blood Line. Please do not reply.</p>
    </div>
  </div>
</div>`

const para = (text)=>`<p style="margin:0 0 14px;color:#404040;font-size:14px;line-height:1.6">${text}</p>`

/**
 * The automatic-cancellation notice a donor receives when the recipient settles on somebody else.
 *
 * The wording is fixed by the spec and is deliberately neutral about who cancelled: the donor did
 * nothing wrong and must not be shown this as a rejection they initiated. Callers are responsible
 * for sending it at most once per donor - see cancelCompetingRequests in reqBloodController.js,
 * which only reaches this after a compare-and-set on the request status has actually succeeded,
 * so a request that was already rejected or cancelled never produces a second notice.
 */
export const sendDonorCancellationEmail = async ({email, donorName})=>{
    if(!email) return {ok:false, error:'donor has no email address'}

    const name = donorName || 'Donor'
    const subject = 'Blood Request Automatically Cancelled — GCES Blood Line'
    const text = [
        `Hello ${name},`,
        '',
        'The recipient has confirmed another donor for their blood requirement. Your pending or accepted request has therefore been automatically cancelled.',
        '',
        'Thank you for your willingness to donate blood and save a life.',
        '',
        'GCES Blood Line Team',
    ].join('\n')

    const html = layout('Your blood donation request was cancelled', [
        para(`Hello <strong>${name}</strong>,`),
        para('The recipient has confirmed another donor for their blood requirement. Your pending or accepted request has therefore been automatically cancelled.'),
        para('Thank you for your willingness to donate blood and save a life.'),
        para('<strong>GCES Blood Line Team</strong>'),
    ].join(''))

    return sendMail({to:email, subject, text, html})
}

/**
 * The signup verification code. Kept here rather than in the controller so the plaintext OTP
 * exists in exactly two places - the generator and this template - and never in a response body.
 */
export const sendSignupOtpEmail = async ({email, username, otp, minutes})=>{
    const name = username || 'there'
    const subject = 'Verify your email — GCES Blood Line'
    const text = [
        `Hello ${name},`,
        '',
        `Your GCES Blood Line verification code is ${otp}`,
        '',
        `This code expires in ${minutes} minutes. If you did not request it, you can ignore this email.`,
        '',
        'GCES Blood Line Team',
    ].join('\n')

    const html = layout('Verify your email address', [
        para(`Hello <strong>${name}</strong>,`),
        para('Use the code below to finish creating your GCES Blood Line account.'),
        `<div style="margin:0 0 18px;padding:18px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;text-align:center">
           <span style="display:inline-block;color:#dc2626;font-size:32px;font-weight:700;letter-spacing:8px;font-family:Consolas,Menlo,monospace">${otp}</span>
         </div>`,
        para(`This code expires in <strong>${minutes} minutes</strong>. If you did not request it, you can safely ignore this email.`),
        para('<strong>GCES Blood Line Team</strong>'),
    ].join(''))

    return sendMail({to:email, subject, text, html})
}
