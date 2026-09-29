export const TAMIL_NADU_DISTRICTS = [
    "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri",
    "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur",
    "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris",
    "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga",
    "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
    "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore",
    "Viluppuram", "Virudhunagar"
]

// India Post returns district names with regional spelling variants that do not
// match the canonical list above, so they are mapped explicitly.
const DISTRICT_ALIASES = {
    kancheepuram: "Kanchipuram",
    kanniyakumari: "Kanyakumari",
    nagappattinam: "Nagapattinam",
    pudukottai: "Pudukkottai",
    sivagangai: "Sivaganga",
    tanjore: "Thanjavur",
    thenilgiris: "Nilgiris",
    thiruchirappalli: "Tiruchirappalli",
    thirunelveli: "Tirunelveli",
    thiruvallur: "Tiruvallur",
    thiruvannamalai: "Tiruvannamalai",
    thiruvarur: "Tiruvarur",
    thoothukkudi: "Thoothukudi",
    tirupattur: "Tirupathur",
    tirupur: "Tiruppur",
    tiruchirapalli: "Tiruchirappalli",
    trichy: "Tiruchirappalli",
    tuticorin: "Thoothukudi",
    villupuram: "Viluppuram",
    virudhunagar: "Virudhunagar"
}

const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z]/g, "")

const CANONICAL_BY_KEY = TAMIL_NADU_DISTRICTS.reduce((acc, district) => {
    acc[normalize(district)] = district
    return acc
}, {})

export const resolveTamilNaduDistrict = (districtName) => {
    const key = normalize(districtName)
    if (!key) return null
    return CANONICAL_BY_KEY[key] || DISTRICT_ALIASES[key] || null
}

const isValidPinCode = (pinCode) => /^[1-9][0-9]{5}$/.test(String(pinCode).trim())

// Distinguishes "India Post says this pincode has no records" (reachable, empty)
// from "India Post could not be reached" (unreachable) — the two must not be
// treated alike, or an unknown pincode would slip through the outage fallback.
const fetchPostOffices = async (pinCode) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pinCode}`, { signal: controller.signal })
        if (!res.ok) return { reachable: false }
        const entry = (await res.json())?.[0]
        if (!entry) return { reachable: false }
        if (entry.Status !== "Success" || !Array.isArray(entry.PostOffice)) return { reachable: true, offices: [] }
        return { reachable: true, offices: entry.PostOffice }
    } catch {
        return { reachable: false }
    } finally {
        clearTimeout(timeout)
    }
}

/**
 * Verifies a pin code / district / place triple against India Post.
 * Returns {ok:true, district, place} with canonical values, or {ok:false, message}.
 * If India Post is unreachable the check degrades to a district-in-Tamil-Nadu test
 * so an upstream outage cannot block signups.
 *
 * requirePlace can be turned off for callers that reuse a profile saved before the
 * place field existed; the pin code is still pinned to its district in that case.
 */
export const verifyPinCodeLocation = async (pinCode, district, place, { requirePlace = true } = {}) => {
    if (!isValidPinCode(pinCode)) return { ok: false, message: "Enter a valid 6-digit pincode" }

    const claimedDistrict = resolveTamilNaduDistrict(district)
    if (!claimedDistrict) return { ok: false, message: "GCES Blood Line currently supports Tamil Nadu districts only" }

    const trimmedPlace = String(place || "").trim()
    if (!trimmedPlace && requirePlace) return { ok: false, message: "Please select your place" }

    const { reachable, offices } = await fetchPostOffices(pinCode)
    if (!reachable) return { ok: true, district: claimedDistrict, place: trimmedPlace }
    if (!offices.length) return { ok: false, message: "No location found for this pincode" }

    const tamilNaduOffices = offices.filter(office => office.State === "Tamil Nadu" && resolveTamilNaduDistrict(office.District))
    if (!tamilNaduOffices.length) {
        return { ok: false, message: "This pincode is outside Tamil Nadu, which GCES Blood Line does not serve yet" }
    }

    if (!trimmedPlace) {
        const onlyDistrict = resolveTamilNaduDistrict(tamilNaduOffices[0].District)
        if (onlyDistrict !== claimedDistrict) return { ok: false, message: "District does not match the given pincode" }
        return { ok: true, district: onlyDistrict, place: "" }
    }

    const matchedOffice = tamilNaduOffices.find(office => normalize(office.Name) === normalize(trimmedPlace))
    if (!matchedOffice) return { ok: false, message: "The selected place does not belong to this pincode" }

    const matchedDistrict = resolveTamilNaduDistrict(matchedOffice.District)
    if (matchedDistrict !== claimedDistrict) return { ok: false, message: "District does not match the given pincode" }

    return { ok: true, district: matchedDistrict, place: matchedOffice.Name }
}
