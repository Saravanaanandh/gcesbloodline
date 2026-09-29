import axios from "axios"

// In production the frontend is served by the same Express server, so relative
// paths work and no URL is needed.
//
// In development the Vite dev server runs separately.  VITE_API_URL lets you
// pin a specific backend address (useful if you run the frontend on a different
// port or machine).  When it is absent the backend is assumed to be on the same
// hostname as the browser but on port 5000 - this means both your laptop
// (localhost:5000) and your friend's laptop (192.168.x.x:5000) work without
// touching this file or any .env.
const getBaseURL = () => {
    if (import.meta.env.MODE !== "development") return "/api/v1"
    if (import.meta.env.VITE_API_URL) return `${import.meta.env.VITE_API_URL}/api/v1`
    return `http://${window.location.hostname}:5000/api/v1`
}

export const axiosInstance = axios.create({
    baseURL: getBaseURL(),
    withCredentials: true
})
