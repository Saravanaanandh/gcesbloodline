import { useState, useRef, useEffect } from "react";
import { Building2, X } from "lucide-react";

// Curated list of prominent hospitals (Government Medical Colleges, Major Private Hospitals & Specialty Centers)
const DEFAULT_HOSPITALS = [
  "Government Mohan Kumaramangalam Medical College Hospital, Salem",
  "Manipal Hospital, Salem",
  "Apollo Specialty Hospital, Salem",
  "Salem Polyclinic, Salem",
  "Dhanvantri Critical Care Center, Salem",
  "SKS Hospital, Salem",
  "SPMM Hospital, Salem",
  "Rajiv Gandhi Government General Hospital, Chennai",
  "Apollo Hospitals, Greams Road, Chennai",
  "Fortis Malar Hospital, Chennai",
  "MIOT International, Chennai",
  "SIMS Hospital, Vadapalani, Chennai",
  "Kauvery Hospital, Chennai",
  "Government Stanley Medical College Hospital, Chennai",
  "Kilpauk Medical College Hospital, Chennai",
  "Christian Medical College (CMC), Vellore",
  "JIPMER, Puducherry",
  "Ganga Medical Centre & Hospital, Coimbatore",
  "PSG Hospitals, Coimbatore",
  "KG Hospital, Coimbatore",
  "Kovai Medical Center and Hospital (KMCH), Coimbatore",
  "Government Rajaji Hospital, Madurai",
  "Meenakshi Mission Hospital and Research Centre, Madurai",
  "Apollo Specialty Hospital, Madurai",
  "Tirunelveli Medical College Hospital, Tirunelveli",
  "Thanjavur Medical College Hospital, Thanjavur",
  "Government Medical College Hospital, Tiruchirappalli",
  "Kauvery Hospital, Tiruchirappalli",
  "All India Institute of Medical Sciences (AIIMS)",
  "St. John's Medical College Hospital, Bangalore",
  "Narayana Health City, Bangalore",
  "Manipal Hospital, Bangalore",
  "Aster CMI Hospital, Bangalore",
  "KIMS Hospital, Hyderabad",
  "Yashoda Hospitals, Hyderabad",
  "Care Hospitals, Hyderabad",
  "City Government Hospital",
  "District Headquarter Hospital",
  "Primary Health Centre (PHC)",
  "Community Health Centre (CHC)",
];

const HospitalAutocomplete = ({
  value = "",
  onChange,
  placeholder = "Enter hospital name (optional)",
  className = "",
  id = "hospitalInfo",
  name = "hospitalInfo",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Filter suggestions based on typed value (minimum 1 character)
  const trimmedValue = value ? value.trim().toLowerCase() : "";
  const filteredSuggestions = trimmedValue
    ? DEFAULT_HOSPITALS.filter((h) => h.toLowerCase().includes(trimmedValue)).slice(0, 7)
    : [];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(val);
    setIsOpen(val.trim().length > 0);
    setHighlightedIndex(-1);
  };

  const handleSelectSuggestion = (suggestion) => {
    onChange(suggestion);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!isOpen || filteredSuggestions.length === 0) {
      if (e.key === "ArrowDown" && value.trim().length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(filteredSuggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  // Helper to highlight matching portion of text
  const renderHighlighted = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={index} className="font-semibold text-red-600 dark:text-red-400 underline decoration-red-400">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          autoComplete="off"
          value={value || ""}
          onChange={handleInputChange}
          onFocus={() => {
            if (value && value.trim().length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${className} pr-8`}
        />
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 text-gray-400 hover:text-gray-700 dark:hover:text-white p-0.5 transition-colors"
            title="Clear hospital"
            tabIndex={-1}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      {/* Autocomplete suggestions dropdown */}
      {isOpen && filteredSuggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl z-50 py-1 text-xs sm:text-sm"
        >
          {filteredSuggestions.map((suggestion, index) => {
            const isHighlighted = index === highlightedIndex;
            return (
              <li
                key={index}
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleSelectSuggestion(suggestion)}
                className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors ${
                  isHighlighted
                    ? "bg-red-50 text-red-700 dark:bg-zinc-800 dark:text-red-300"
                    : "text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Building2 className="size-3.5 text-red-500 shrink-0 opacity-70" />
                <span className="truncate">{renderHighlighted(suggestion, trimmedValue)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default HospitalAutocomplete;
