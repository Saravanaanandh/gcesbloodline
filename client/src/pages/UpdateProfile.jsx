import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { useAuthStore } from "../store/useAuthStore.jsx";
import Navbar from "../components/Navbar.jsx";
import Loading from "../components/Loading.jsx";
import bannerImg from "./../assets/banner.png";
import profilePic from "./../assets/user.png";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Droplets,
  HeartHandshake,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Award,
  Edit3,
  X,
  CheckCircle2,
  AlertTriangle,
  User,
  Activity,
  ArrowRight,
  Loader2,
  AlertCircle,
  Heart,
  CalendarClock,
  Info,
  BellRing,
  FileText,
} from "lucide-react";
import { resolveTamilNaduDistrict } from "../lib/tamilNaduDistricts.js";
import { DONATION_GAP_DAYS, formatDonationDate, getDonationWindow } from "../lib/donationWindow.js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const samePlace = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

const UpdateProfile = () => {
  const { authUser, updateProfile, getUser, isProfileUpdating, isUserAsDonor } = useAuthStore();
  const navigate = useNavigate();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    weight: "",
    location: "",
    place: "",
    pinCode: "",
    mobile: "",
    tattooIn12: false,
    positiveHIVTest: false,
  });
  const [lookup, setLookup] = useState({ loading: false, error: "", places: [] });

  const bannerRef = useRef(null);
  const profileRef = useRef(null);
  const lookupId = useRef(0);

  const savedPinCode = String(authUser?.pinCode || "");
  const savedPlace = authUser?.place || "";

  useEffect(() => {
    getUser();
  }, [getUser]);

  useEffect(() => {
    if (!isEditModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isEditModalOpen]);

  useEffect(() => {
    if (authUser) {
      setFormData({
        username: authUser.username || "",
        weight: authUser.weight || "",
        location: authUser.location || "",
        place: authUser.place || "",
        pinCode: String(authUser.pinCode || ""),
        mobile: authUser.mobile || "",
        tattooIn12: !!authUser.tattooIn12,
        positiveHIVTest: !!authUser.positiveHIVTest,
      });
    }
  }, [authUser]);

  useEffect(() => {
    const pin = String(formData.pinCode || "");
    const requestId = ++lookupId.current;
    // The pincode already on the profile keeps its stored district/place visible
    // while it revalidates; any other pincode invalidates them immediately.
    const isStoredPin = pin === savedPinCode;
    if (!isStoredPin) {
      setFormData((prev) => (prev.location || prev.place ? { ...prev, location: "", place: "" } : prev));
    }
    setLookup({ loading: false, error: "", places: [] });

    if (pin.length !== 6) return;
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setLookup({ loading: false, error: "Enter a valid 6-digit pincode", places: [] });
      return;
    }

    const controller = new AbortController();
    setLookup({ loading: true, error: "", places: [] });

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: controller.signal });
        const data = await res.json();
        if (requestId !== lookupId.current) return;

        const offices = data?.[0]?.Status === "Success" ? data[0].PostOffice || [] : [];
        if (!offices.length) {
          setLookup({ loading: false, error: "No location found for this pincode", places: [] });
          return;
        }

        const tamilNaduOffices = offices.filter(
          (office) => office.State === "Tamil Nadu" && resolveTamilNaduDistrict(office.District)
        );
        if (!tamilNaduOffices.length) {
          setLookup({
            loading: false,
            error: `${offices[0].District}, ${offices[0].State} is outside Tamil Nadu. GCES Blood Line does not serve this area yet.`,
            places: [],
          });
          return;
        }

        const district = resolveTamilNaduDistrict(tamilNaduOffices[0].District);
        const places = [...new Set(tamilNaduOffices.map((office) => office.Name))];
        setLookup({ loading: false, error: "", places });
        setFormData((prev) => {
          if (String(prev.pinCode || "") !== pin) return prev;
          const alreadyChosen = places.find((p) => samePlace(p, prev.place));
          const stored = isStoredPin ? places.find((p) => samePlace(p, savedPlace)) : undefined;
          return {
            ...prev,
            location: district,
            place: alreadyChosen || stored || (places.length === 1 ? places[0] : ""),
          };
        });
      } catch (err) {
        if (err.name === "AbortError" || requestId !== lookupId.current) return;
        setLookup({ loading: false, error: "Could not fetch location. Check your connection and try again.", places: [] });
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [formData.pinCode, savedPinCode, savedPlace]);

  if (!authUser) {
    return <Loading />;
  }

  // Handle Cover / Banner Upload
  const handleBannerChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Cover image must be under 5MB");
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        setIsUploadingBanner(true);
        await updateProfile({ banner: reader.result });
      } catch (err) {
        toast.error("Failed to upload cover banner");
      } finally {
        setIsUploadingBanner(false);
      }
    };
  };

  // Handle Avatar Upload
  const handleProfileImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Profile picture must be under 5MB");
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        setIsUploadingProfile(true);
        await updateProfile({ profile: reader.result });
      } catch (err) {
        toast.error("Failed to upload profile picture");
      } finally {
        setIsUploadingProfile(false);
      }
    };
  };

  // Handle Availability Toggle
  const handleToggleAvailability = async () => {
    try {
      const nextStatus = !authUser.available;
      // Going available again after a donation is a deliberate opt-in, and it only counts
      // once the eligibility form reflects the donor's current health.
      if (nextStatus && authUser.lastDonated && authUser.eligibilityFormCurrent === false) {
        toast.error("Fill your donor eligibility form again before making yourself available");
        return navigate("/donate");
      }
      await updateProfile({ available: nextStatus });
    } catch (err) {
      toast.error("Could not update availability status");
    }
  };

  // Handle Form Submission from Edit Modal
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (formData.username && formData.username.trim().length < 2) {
      return toast.error("Please enter a valid full name");
    }

    if (formData.mobile && !/^\d{10}$/.test(formData.mobile.toString())) {
      return toast.error("Mobile number must be exactly 10 digits");
    }

    if (formData.pinCode && !/^\d{6}$/.test(formData.pinCode.toString())) {
      return toast.error("Pincode must be exactly 6 digits");
    }

    if (formData.weight && (isNaN(Number(formData.weight)) || Number(formData.weight) < 30 || Number(formData.weight) > 250)) {
      return toast.error("Please enter a valid weight (30-250 kg)");
    }

    if (lookup.loading) return toast.error("Please wait, detecting your location...");
    if (lookup.error) return toast.error(lookup.error);
    if (formData.pinCode && !formData.location) {
      return toast.error("Enter a valid Tamil Nadu pincode to detect your district");
    }
    if (formData.pinCode && !formData.place) return toast.error("Please select your place");

    try {
      await updateProfile({
        username: formData.username ? formData.username.trim() : undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
        location: formData.location || undefined,
        place: formData.place || undefined,
        pinCode: formData.pinCode ? Number(formData.pinCode) : undefined,
        mobile: formData.mobile ? Number(formData.mobile) : undefined,
        tattooIn12: formData.tattooIn12,
        positiveHIVTest: formData.positiveHIVTest,
      });
      setIsEditModalOpen(false);
    } catch (err) {
      // Handled in store
    }
  };

  const formattedJoinDate = authUser.createdAt
    ? new Date(authUser.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "Member";

  // Everything the post-donation guidance needs: the estimated next date, whether it has
  // arrived, and whether the donor still has to opt back in.
  const donationWindow = getDonationWindow(authUser);
  const nextDonationLabel = formatDonationDate(donationWindow.nextDonationDate);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors duration-300 pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {/* ===================== HERO COVER & PROFILE HEADER ===================== */}
        <div className="relative rounded-3xl overflow-hidden shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          {/* Cover Banner */}
          <div className="relative w-full h-48 sm:h-64 lg:h-72 bg-neutral-800">
            <img
              src={authUser.banner || bannerImg}
              alt="Cover Banner"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Change Cover Button */}
            <input
              type="file"
              ref={bannerRef}
              className="hidden"
              accept="image/*"
              onChange={handleBannerChange}
            />
            <button
              onClick={() => bannerRef.current?.click()}
              disabled={isUploadingBanner}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 px-3.5 py-2 rounded-xl bg-black/50 hover:bg-black/75 backdrop-blur-md text-white text-xs sm:text-sm font-medium border border-white/20 transition-all duration-200 flex items-center gap-2 shadow-lg cursor-pointer"
            >
              {isUploadingBanner ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
              <span className="hidden sm:inline">Change Cover</span>
            </button>
          </div>

          {/* User Info Bar */}
          <div className="relative px-6 sm:px-10 pb-8">
            {/* Top Row: Avatar on Left + Action Buttons on Right */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 md:-mt-24">
              {/* Large Avatar */}
              <div className="relative inline-block self-center sm:self-auto">
                <input
                  type="file"
                  ref={profileRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                />
                <div className="size-32 sm:size-36 md:size-40 rounded-full ring-4 sm:ring-6 ring-white dark:ring-neutral-900 overflow-hidden shadow-2xl bg-white dark:bg-neutral-800">
                  <img
                    src={authUser.profile || profilePic}
                    alt={authUser.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => profileRef.current?.click()}
                  disabled={isUploadingProfile}
                  className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 p-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg border-2 border-white dark:border-neutral-900 transition-all duration-200 hover:scale-110 cursor-pointer"
                  title="Update Profile Photo"
                >
                  {isUploadingProfile ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Camera className="size-4" />
                  )}
                </button>
              </div>

              {/* Action Buttons: Donate Blood, Blood Request, Availability & Edit */}
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 sm:gap-3 pt-2 sm:pt-0">
                {/* Donate Blood Button - carries a warning badge until the donor form is filled */}
                <Link
                  to="/donate"
                  className="relative px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-red-600/30 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title={
                    isUserAsDonor
                      ? "Become a blood donor or find donation drives"
                      : "Complete your donor form to start donating."
                  }
                >
                  <Droplets className="size-4 fill-current" />
                  <span>Donate Blood</span>
                  {!isUserAsDonor && (
                    <span
                      className="absolute -top-2 -right-2 flex items-center justify-center size-6 rounded-full bg-yellow-400 text-yellow-950 ring-2 ring-white dark:ring-neutral-900 shadow-md animate-pulse"
                      aria-hidden="true"
                    >
                      <AlertTriangle className="size-3.5" strokeWidth={2.5} />
                    </span>
                  )}
                </Link>

                {/* Blood Request Button with Dialog */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="px-4 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-red-500 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white font-bold text-xs sm:text-sm shadow-sm flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      title="Post a blood request"
                    >
                      <HeartHandshake className="size-4" />
                      <span>Blood Request</span>
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-xl font-bold">
                        For whom are you requesting blood?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-sm text-neutral-500 dark:text-neutral-400">
                        Please select whether this blood request is for yourself or for another patient in need.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-3 mt-4">
                      <AlertDialogCancel
                        onClick={() => navigate("/requestme")}
                        className="rounded-xl border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 font-semibold cursor-pointer"
                      >
                        For Me
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => navigate("/request")}
                        className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer shadow-md"
                      >
                        For Others
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* My Blood Request - the submitted recipient form, read only */}
                <Link
                  to="/myrequest"
                  className="px-4 py-2.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-red-400 hover:text-red-600 dark:hover:text-red-400 font-bold text-xs sm:text-sm shadow-sm flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title="View the blood request you submitted, its date and its current status"
                >
                  <FileText className="size-4" />
                  <span>My Blood Request</span>
                </Link>

                {/* Donor Availability Toggle Switch */}
                <div
                  onClick={handleToggleAvailability}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleToggleAvailability();
                    }
                  }}
                  className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 shadow-sm cursor-pointer select-none transition-all hover:border-neutral-300 dark:hover:border-neutral-600"
                  title="Click to toggle your donor availability"
                >
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 leading-none">
                      Availability
                    </span>
                    <span
                      className={`text-xs font-bold mt-0.5 ${
                        authUser.available
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-neutral-500 dark:text-neutral-400"
                      }`}
                    >
                      {authUser.available ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  {/* Toggle Pill Track & Knob */}
                  <div
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out ${
                      authUser.available
                        ? "bg-emerald-500 shadow-sm shadow-emerald-500/40"
                        : "bg-neutral-300 dark:bg-neutral-600"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out ${
                        authUser.available ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>

                {/* Edit Profile Button */}
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white font-medium text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg cursor-pointer hover:scale-105 active:scale-95 border border-neutral-700 dark:border-neutral-600"
                >
                  <Edit3 className="size-4" />
                  <span>Edit Details</span>
                </button>
              </div>
            </div>

            {/* Donor form warning - full width so it stays readable on mobile too */}
            {!isUserAsDonor && (
              <Link
                to="/donate"
                className="mt-5 flex items-start sm:items-center gap-3 rounded-2xl border-2 border-yellow-400 bg-yellow-50 dark:border-yellow-500/60 dark:bg-yellow-500/10 px-4 py-3 transition-all hover:border-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-500/20"
              >
                <span className="flex items-center justify-center size-8 shrink-0 rounded-full bg-yellow-400 text-yellow-950 shadow-sm">
                  <AlertTriangle className="size-4" strokeWidth={2.5} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-yellow-900 dark:text-yellow-200">
                    Complete your donor form to start donating.
                  </p>
                  <p className="text-xs text-yellow-800/80 dark:text-yellow-300/70 mt-0.5">
                    Until then you will not appear in Find Donors and cannot accept blood donation requests.
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-yellow-700 dark:text-yellow-300 mt-1 sm:mt-0" />
              </Link>
            )}

            {/* Post-donation guidance: a thank you with the estimated next date while the
                donor is resting, and a reminder once that date arrives. */}
            {donationWindow.hasDonated && !donationWindow.isDue && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border-2 border-rose-300 bg-rose-50 dark:border-rose-500/50 dark:bg-rose-500/10 px-4 py-3">
                <span className="flex items-center justify-center size-8 shrink-0 rounded-full bg-rose-500 text-white shadow-sm">
                  <Heart className="size-4 fill-current" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-rose-900 dark:text-rose-200">
                    Thank you for saving a life! Your estimated next donation date is{" "}
                    {nextDonationLabel}, {DONATION_GAP_DAYS} days from your last donation.
                  </p>
                  <p className="text-xs text-rose-800/80 dark:text-rose-300/80 mt-0.5">
                    Please consult a blood bank to confirm your eligibility before donating again.
                  </p>
                  <p className="flex items-start gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 mt-2">
                    <Info className="size-3.5 shrink-0 mt-0.5" />
                    <span>
                      This {DONATION_GAP_DAYS}-day gap is an estimate only, not a guarantee of
                      medical eligibility. {donationWindow.daysLeft} day
                      {donationWindow.daysLeft === 1 ? "" : "s"} to go.
                    </span>
                  </p>
                </div>
              </div>
            )}

            {donationWindow.hasDonated && donationWindow.isDue && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-500/10 px-4 py-3">
                <span className="flex items-center justify-center size-8 shrink-0 rounded-full bg-emerald-500 text-white shadow-sm">
                  <BellRing className="size-4" strokeWidth={2.5} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    Your estimated next donation date ({nextDonationLabel}) has arrived.
                  </p>
                  {donationWindow.needsForm || donationWindow.needsOptIn ? (
                    <>
                      <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                        Before donating again:
                        {donationWindow.needsForm && " fill your donor eligibility form"}
                        {donationWindow.needsForm && donationWindow.needsOptIn && " and"}
                        {donationWindow.needsOptIn && " switch Availability on above"}. Until
                        then you cannot accept blood donation requests.
                      </p>
                      {donationWindow.needsForm && (
                        <Link
                          to="/donate"
                          className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
                        >
                          Fill the eligibility form
                          <ArrowRight className="size-3.5" />
                        </Link>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                      You are marked available, so recipients can reach you again.
                    </p>
                  )}
                  <p className="flex items-start gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 mt-2">
                    <Info className="size-3.5 shrink-0 mt-0.5" />
                    <span>
                      This date is an estimate, not a guarantee of medical eligibility. Please
                      consult a blood bank to confirm before donating again.
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Dedicated Name & Details Block - GUARANTEED HIGH VISIBILITY */}
            <div className="mt-5 space-y-2 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-900 dark:text-white tracking-tight drop-shadow-sm">
                  {authUser.username}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-red-600 text-white shadow-sm">
                  <Droplets className="size-3.5 fill-current" />
                  {authUser.bloodType}
                </span>
                {isUserAsDonor ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="size-4 text-emerald-500" />
                    Verified Donor
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-yellow-400/15 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30">
                    <AlertTriangle className="size-4 text-yellow-500" />
                    Donor Form Pending
                  </span>
                )}
              </div>

              {/* Sub-strip with contact and meta details */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-y-2 gap-x-4 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 pt-1">
                <span className="flex items-center gap-1.5">
                  <Mail className="size-4 text-red-500" />
                  <span className="font-medium text-neutral-800 dark:text-neutral-200">{authUser.email}</span>
                </span>
                <span className="hidden sm:inline text-neutral-300 dark:text-neutral-700">•</span>
                <span className="flex items-center gap-1.5">
                  <Phone className="size-4 text-neutral-400" />
                  <span>+91 {authUser.mobile}</span>
                </span>
                <span className="hidden sm:inline text-neutral-300 dark:text-neutral-700">•</span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4 text-neutral-400" />
                  <span>{authUser.location || "Tamil Nadu"}</span>
                </span>
                <span className="hidden sm:inline text-neutral-300 dark:text-neutral-700">•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-4 text-neutral-400" />
                  <span>Joined {formattedJoinDate}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== HIGHLIGHT STATS CARDS ===================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Card 1: Blood Group */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Blood Group
              </span>
              <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
                <Droplets className="size-5 fill-current" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-red-600 dark:text-red-500">
                {authUser.bloodType}
              </span>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {authUser.bloodType === "O-"
                  ? "Universal Blood Donor"
                  : authUser.bloodType === "AB+"
                  ? "Universal Blood Recipient"
                  : "Lifesaving Donor Match"}
              </p>
            </div>
          </div>

          {/* Card 2: Total Donations */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Total Donations
              </span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <Award className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-neutral-900 dark:text-white">
                {authUser.donation || 0}
              </span>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                ~{((authUser.donation || 0) * 3)} Lives Impacted
              </p>
            </div>
          </div>

          {/* Card 3: Last Donated */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Last Donated
              </span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Calendar className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white block truncate">
                {authUser.lastDonated
                  ? new Date(authUser.lastDonated).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "No donations yet"}
              </span>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {authUser.lastDonated ? "Thank you for saving lives" : "First donation pending"}
              </p>
            </div>
          </div>

          {/* Card 4: Estimated Next Donation - labelled as an estimate everywhere it shows */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Next Donation (Est.)
              </span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                <CalendarClock className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white block truncate">
                {donationWindow.hasDonated && nextDonationLabel
                  ? donationWindow.isDue
                    ? "Eligible now (est.)"
                    : nextDonationLabel
                  : "Any time"}
              </span>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {donationWindow.hasDonated && nextDonationLabel
                  ? donationWindow.isDue
                    ? `Estimate only - confirm with a blood bank`
                    : `${donationWindow.daysLeft} day${donationWindow.daysLeft === 1 ? "" : "s"} left - estimate only`
                  : "No waiting period yet"}
              </p>
            </div>
          </div>

        </div>

        {/* ===================== PLATFORM DIRECTORIES (PRIMARY NAVIGATION) ===================== */}
        <div className="mt-6 p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-neutral-100 dark:border-neutral-800">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
              <Droplets className="size-5 fill-current" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Platform Directories</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Find donors and recipients across the GCES Blood Line network
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/alldonors"
              className="p-5 sm:p-6 rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 hover:border-red-500 dark:hover:border-red-500 hover:shadow-lg hover:shadow-red-600/10 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                  <Droplets className="size-6 sm:size-7" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                    Find Donors
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                    View and search available blood donors
                  </p>
                </div>
              </div>
              <ArrowRight className="size-5 text-neutral-400 group-hover:text-red-500 group-hover:translate-x-1 transition-all shrink-0" />
            </Link>

            <Link
              to="/allrequests"
              className="p-5 sm:p-6 rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 hover:border-red-500 dark:hover:border-red-500 hover:shadow-lg hover:shadow-red-600/10 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <HeartHandshake className="size-6 sm:size-7" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
                    Urgent Requests
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                    View recipients who need blood
                  </p>
                </div>
              </div>
              <ArrowRight className="size-5 text-neutral-400 group-hover:text-red-500 group-hover:translate-x-1 transition-all shrink-0" />
            </Link>
          </div>
        </div>

        {/* ===================== DETAILED USER DATA SECTIONS ===================== */}
        <div className="mt-6 space-y-6">
            {/* Section A: Personal & Biological Profile */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                    <User className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                      Personal & Physical Profile
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Basic biological and demographic parameters
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* Full Name display */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 col-span-2 sm:col-span-1">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Full Name</span>
                  <p className="text-base sm:text-lg font-bold mt-1 text-neutral-900 dark:text-white truncate">
                    {authUser.username}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Age</span>
                  <p className="text-base sm:text-lg font-semibold mt-1 text-neutral-900 dark:text-white">
                    {authUser.age} Years
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Gender</span>
                  <p className="text-base sm:text-lg font-semibold mt-1 text-neutral-900 dark:text-white capitalize">
                    {authUser.gender?.toLowerCase()}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Blood Group</span>
                  <p className="text-base sm:text-lg font-semibold mt-1 text-red-600 dark:text-red-400">
                    {authUser.bloodType}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Weight</span>
                  <p className="text-base sm:text-lg font-semibold mt-1 text-neutral-900 dark:text-white">
                    {authUser.weight ? `${authUser.weight} kg` : "Not provided"}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Weight Criteria</span>
                  <p className="text-sm font-semibold mt-1 flex items-center gap-1.5">
                    {authUser.weight && Number(authUser.weight) >= 45 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="size-4" /> ≥45kg (Pass)
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="size-4" /> Under 45kg
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Section B: Contact & Location */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <MapPin className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                      Contact & Location
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Reachability for local emergency coordination
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 flex items-start gap-3">
                  <Phone className="size-5 text-neutral-400 mt-0.5" />
                  <div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Mobile Number</span>
                    <p className="text-base font-semibold text-neutral-900 dark:text-white mt-0.5">
                      +91 {authUser.mobile}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 flex items-start gap-3">
                  <Mail className="size-5 text-neutral-400 mt-0.5" />
                  <div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Email Address</span>
                    <p className="text-base font-semibold text-neutral-900 dark:text-white mt-0.5 truncate">
                      {authUser.email}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 flex items-start gap-3">
                  <MapPin className="size-5 text-neutral-400 mt-0.5" />
                  <div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">District / Location</span>
                    <p className="text-base font-semibold text-neutral-900 dark:text-white mt-0.5">
                      {authUser.location || "Tamil Nadu"}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 flex items-start gap-3">
                  <Activity className="size-5 text-neutral-400 mt-0.5" />
                  <div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Postal PIN Code</span>
                    <p className="text-base font-semibold text-neutral-900 dark:text-white mt-0.5">
                      {authUser.pinCode || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 flex items-start gap-3">
                  <MapPin className="size-5 text-neutral-400 mt-0.5" />
                  <div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Place</span>
                    <p className="text-base font-semibold text-neutral-900 dark:text-white mt-0.5">
                      {authUser.place || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section C: Medical & Safety Screening */}
            <div className="p-6 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                      Medical & Eligibility Screening
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Safety questions for blood recipient protection
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Tattoo or Piercing in Last 12 Months
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Standard safety deferral protocol
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      authUser.tattooIn12
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    }`}
                  >
                    {authUser.tattooIn12 ? "Yes (Deferred)" : "No (Cleared)"}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Infectious Screening (HIV)
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Certified non-reactive screening
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      authUser.positiveHIVTest
                        ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    }`}
                  >
                    {authUser.positiveHIVTest ? "Positive (Ineligible)" : "Negative (Safe)"}
                  </span>
                </div>
              </div>
            </div>
        </div>
      </main>

      {/* ===================== EDIT PROFILE MODAL ===================== */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden"
            >
              {/* Modal Header — pinned so the close button is always reachable */}
              <div className="shrink-0 flex items-center justify-between gap-3 px-6 sm:px-8 pt-6 sm:pt-7 pb-4 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
                    <Edit3 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                      Edit Profile Details
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Update your display name, contact, and eligibility information
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  aria-label="Close edit profile"
                  className="shrink-0 p-2 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Modal Form — the only scrollable region */}
              <form
                onSubmit={handleSaveProfile}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4 px-6 sm:px-8 pt-5 pb-6 sm:pb-8"
              >
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MUKESH S"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/70 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Mobile Number (10 Digits)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/70 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* PIN Code & Weight in 2 columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400 mb-1.5">
                      Pincode (6 Digits)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="e.g. 600001"
                        value={formData.pinCode}
                        onChange={(e) =>
                          setFormData({ ...formData, pinCode: e.target.value.replace(/\D/g, "").slice(0, 6) })
                        }
                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/70 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500"
                      />
                      {lookup.loading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-red-500 animate-spin" />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400 mb-1.5">
                      Weight in Kg
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 65"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/70 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                {/* Pincode lookup status */}
                {lookup.loading && (
                  <p className="text-xs text-red-500 dark:text-red-400 -mt-1">Detecting your location...</p>
                )}
                {lookup.error && (
                  <p className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400 -mt-1">
                    <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                    {lookup.error}
                  </p>
                )}
                {!lookup.loading && !lookup.error && formData.location && (
                  <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 -mt-1">
                    <MapPin className="size-3.5 shrink-0" />
                    Location detected automatically
                  </p>
                )}

                {/* Auto-detected District */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400 mb-1.5">
                    District / Location (Tamil Nadu)
                  </label>
                  <input
                    type="text"
                    readOnly
                    placeholder="Auto-filled from pincode"
                    value={formData.location}
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none cursor-not-allowed"
                  />
                </div>

                {/* Place (dropdown when the pincode covers several post offices) */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Place
                  </label>
                  {lookup.places.length > 1 ? (
                    <>
                      <select
                        value={formData.place}
                        onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/70 text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                      >
                        <option value="">Select your place ({lookup.places.length} found)</option>
                        {lookup.places.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5">
                        Multiple places share this pincode. Please select yours.
                      </p>
                    </>
                  ) : (
                    <input
                      type="text"
                      readOnly
                      placeholder="Auto-filled from pincode"
                      value={formData.place}
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none cursor-not-allowed"
                    />
                  )}
                </div>

                {/* Medical Screening Checkboxes */}
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-3 mt-2">
                  <span className="block text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">
                    Medical Conditions
                  </span>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.tattooIn12}
                      onChange={(e) =>
                        setFormData({ ...formData, tattooIn12: e.target.checked })
                      }
                      className="size-4 rounded accent-red-600 cursor-pointer"
                    />
                    <span className="text-sm text-neutral-800 dark:text-neutral-200">
                      Had a tattoo or piercing in the last 12 months
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.positiveHIVTest}
                      onChange={(e) =>
                        setFormData({ ...formData, positiveHIVTest: e.target.checked })
                      }
                      className="size-4 rounded accent-red-600 cursor-pointer"
                    />
                    <span className="text-sm text-neutral-800 dark:text-neutral-200">
                      Tested positive for HIV or blood infectious diseases
                    </span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium text-sm transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isProfileUpdating}
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProfileUpdating && <Loader2 className="size-4 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UpdateProfile;
