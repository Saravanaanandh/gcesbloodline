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
