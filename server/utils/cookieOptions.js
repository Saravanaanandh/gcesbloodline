/**
 * JWT cookie options, shared by every handler that issues or clears the login cookie.
 *
 * Lifted out of authController.js when signup verification became its own controller, so the two
 * places that set the cookie cannot drift apart - a mismatch between the set and clear options is
 * how a logout silently leaves the cookie in place.
 *
 * secure/sameSite are decided per request rather than per deployment, because the same build has
 * to work over https on Render and over plain http on a Wi-Fi LAN address during development.
 * SameSite=None requires Secure, so on http the pair has to be lax/false or the browser drops the
 * cookie entirely.
 */

const isProduction = ()=> process.env.NODE_ENV === "production"

const isHttpsRequest = (req)=>
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    (isProduction() && !req.headers.host?.includes('localhost'))

export const getCookieOptions = (req)=>{
    const isHttps = isHttpsRequest(req)
    return {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: isHttps,
        sameSite: isHttps ? "none" : "lax"
    }
}

export const getClearCookieOptions = (req)=>{
    const isHttps = isHttpsRequest(req)
    return {
        httpOnly: true,
        secure: isHttps,
        sameSite: isHttps ? "none" : "lax"
    }
}
