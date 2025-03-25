import React, {
  useCallback,
  useState,
  createContext,
  useContext,
  useEffect,
} from "react";
import { patientApi } from ".././services/api";

interface Patient {
  id: string; // Use client_id from the API as id
  name: string;
  age: number;
  gender: string;
  lastVisit: string;
  contact: string;
}

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Patient[];
  isSearching: boolean;
  error: string | null;
}

const SearchContext = createContext<SearchContextType>({
  searchQuery: "",
  setSearchQuery: () => {},
  searchResults: [],
  isSearching: false,
  error: null,
});

export function useSearch() {
  return useContext(SearchContext);
}

export const SearchProvider = ({ children }: { children: React.ReactNode }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Debounce delay in ms
  const DEBOUNCE_DELAY = 300;

  // Setup debounced search
  useEffect(() => {
    // Don't search if query is empty
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Set up a timer to delay the search
    const timer = setTimeout(() => {
      searchPatients(searchQuery);
    }, DEBOUNCE_DELAY);

    // Clean up the timer if the component unmounts or searchQuery changes
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchPatients = useCallback(async (query: string) => {
    try {
      setError(null);

      // Call the API to search for patients
      try {
        const response = await patientApi.searchPatients(query);

        // Transform the data to match our Patient interface
        const transformedResults: Patient[] = response.map((patient: any) => ({
          id: patient.client_id,
          name: `${patient.first_name} ${patient.last_name}`,
          age: patient.age,
          gender: patient.gender,
          lastVisit: patient.first_visit_date || "N/A",
          contact: patient.phone || "N/A",
        }));

        setSearchResults(transformedResults);
      } catch (err: any) {
        // Check if it's a 404 "Not found" error
        if (
          err.message &&
          (err.message.includes("404") ||
            err.message.includes("No matching patients"))
        ) {
          // This is just "no results" - not a real error
          setSearchResults([]);
        } else {
          // This is a real API error
          console.error("Error searching patients:", err);
          setError("Failed to search patients");
          setSearchResults([]);
        }
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchQuery = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery: handleSearchQuery,
        searchResults,
        isSearching,
        error,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};
