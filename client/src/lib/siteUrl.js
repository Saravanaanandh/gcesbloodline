/**
 * The public address of the app, for links that leave the browser.
 *
 * Deliberately NOT derived from window.location the way the API base URL is. A link in an email is
 * opened from somebody else's phone hours later, so "localhost:5173" or "172.16.137.161:5173" -
 * correct for the tab that sent the mail - is a dead link by the time it is clicked. Email links
 * always point at the deployed site.
 *
 * VITE_SITE_URL overrides it, for a staging deployment on a different domain.
 */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://bloodline.gces.net.in")
    .replace(/\/+$/, "")

/** Absolute URL for an in-app path, e.g. siteLink(`/allrequests/${id}`). */
export const siteLink = (path = "") =>
    `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
