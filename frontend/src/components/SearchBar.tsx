import React, { useState, useRef, useEffect } from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
import { useSearch } from './SearchContext';
import { Link } from 'react-router-dom';

const SearchBar = () => {
  const { searchQuery, setSearchQuery, searchResults, isSearching, error } = useSearch();
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsResultsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Open results dropdown when there are results
  useEffect(() => {
    if (searchResults.length > 0 || isSearching) {
      setIsResultsOpen(true);
    }
  }, [searchResults, isSearching]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Always show results when typing
    if (e.target.value.trim()) {
      setIsResultsOpen(true);
    } else {
      setIsResultsOpen(false);
    }
  };
  
  const clearSearch = () => {
    setSearchQuery('');
    setIsResultsOpen(false);
  };
  
  const handleResultClick = () => {
    setIsResultsOpen(false);
  };
  
  return (
    <div className="relative w-full max-w-md" ref={searchRef}>
      <div className="relative">
        <input
          type="text"
          placeholder="Search patients..."
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => searchQuery.trim() && setIsResultsOpen(true)}
          className="w-full pl-10 pr-10 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <SearchIcon 
          size={18} 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" 
        />
        {searchQuery && (
          <button 
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XIcon size={18} />
          </button>
        )}
      </div>
      
      {isResultsOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
          {isSearching && (
            <div className="flex items-center justify-center p-4 text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
              Searching...
            </div>
          )}
          
          {!isSearching && error && (
            <div className="p-4 text-red-500 dark:text-red-400">
              {error}
            </div>
          )}
          
          {!isSearching && !error && searchResults.length === 0 && searchQuery.trim() !== '' && (
            <div className="p-4 text-gray-500 dark:text-gray-400">
              No results found for "{searchQuery}"
            </div>
          )}
          
          {!isSearching && searchResults.length > 0 && (
            <ul className="py-2">
              {searchResults.map((patient) => (
                <li key={patient.id} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Link 
                    to={`/patients/${patient.id}`} 
                    className="block"
                    onClick={handleResultClick}
                  >
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {patient.name}
                    </div>
                    <div className="flex text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <span className="mr-3">{patient.id}</span>
                      <span className="mr-3">{patient.age}</span>
                      <span className="mr-3">{patient.gender}</span>
                      <span>{patient.contact}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;