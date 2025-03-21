import React, { useState, useEffect } from 'react';
import { XIcon } from 'lucide-react';


// Interface for the API patient data structure
interface Patient {
  client_id: string;
  first_name: string;
  last_name: string;
  age: number;
  gender: string;
  birthdate?: string;
  phone?: string;
  race?: string;
  height?: string;
  primary_lang?: string;
  insurance?: string;
  zipcode?: string;
  first_visit_date?: string;
  // Other fields that might be in the API
}

// Interface for the goals data from API
interface PatientGoals {
  increased_fruit_veg?: number;
  increased_water?: number;
  increased_exercise?: number;
  cut_tv_viewing?: number;
  eat_breakfast?: number;
  limit_alcohol?: number;
  no_late_eating?: number;
  more_whole_grains?: number;
  less_fried_foods?: number;
  low_fat_milk?: number;
  lower_salt?: number;
  annual_checkup?: number;
  quit_smoking?: number;
  // other fields
}

interface EditPatientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  patient: Patient;
  latestGoals?: PatientGoals | null;
}

// Goal mapping
const GOAL_MAPPING: Record<string, string> = {
  increased_fruit_veg: 'INCREASED DAILY FRUIT/ VEGETABLE PORTIONS',
  increased_water: 'INCREASE DAILY WATER INTAKE',
  increased_exercise: 'INCREASED WEEKLY EXERCISE',
  cut_tv_viewing: 'CUT TV VIEWING TO < 2 HOURS/ DAY',
  eat_breakfast: 'EAT BREAKFAST DAILY',
  limit_alcohol: 'LIMIT DAILY ALCOHOL CONSUMPTION WOMAN =1, MAN=2',
  no_late_eating: 'DO NOT EAT AT LEAST 3 HOURS BEFORE GOING TO BED',
  more_whole_grains: 'EATS MORE WHOLE WHEAT/ GRAINS DAILY',
  less_fried_foods: 'EATS LESS FRIED FOODS OR MEATS',
  low_fat_milk: 'DRINKS LOW FAT OR SKIM MILK',
  lower_salt: 'LOWERED SALT INTAKE',
  annual_checkup: 'RECEIVE AN ANNUAL CHECK-UP',
  quit_smoking: 'QUIT SMOKING'
};

const HEALTH_GOALS = Object.values(GOAL_MAPPING);

const LANGUAGES = [
  { value: 'ENGLISH', label: 'English' },
  { value: 'SPANISH', label: 'Spanish' },
  { value: 'CREOLE', label: 'Creole' },
  { value: 'OTHER', label: 'Other' }
];

const RACES = [
  { value: 'AFRICAN AMERICAN', label: 'AFRICAN AMERICAN' },
  { value: 'WHITE', label: 'WHITE' },
  { value: 'HISPANIC', label: 'HISPANIC' },
  { value: 'ASIAN', label: 'ASIAN' },
  { value: 'AMERICAN INDIAN', label: 'AMERICAN INDIAN' },
  { value: 'CARIBBEAN AMERICAN', label: 'CARIBBEAN AMERICAN' },
  { value: 'MULTI-RACE', label: 'MULTI-RACE' },
  { value: 'OTHER', label: 'OTHER' }
];

const INSURANCE_TYPES = [
  { value: 'UNINSURED', label: 'UNINSURED' },
  { value: 'INSURED', label: 'INSURED' },
  { value: 'WVHA', label: 'WVHA' },
  { value: 'MEDICAID', label: 'MEDICAID' },
  { value: 'MEDICARE', label: 'MEDICARE' },
  { value: 'MEDICAID/MEDICARE', label: 'MEDICAID/MEDICARE' },
  { value: 'VA', label: 'VA' },
  { value: 'OTHER', label: 'OTHER' }
];

// Helper function to format date from MM/DD/YY to YYYY-MM-DD for input[type=date]
const formatDateForInput = (dateStr?: string): string => {
  if (!dateStr) return '';
  
  try {
    // Try different date formats
    let date;
    if (dateStr.includes('/')) {
      // MM/DD/YY format
      const parts = dateStr.split('/');
      if (parts.length !== 3) return '';
      
      // If year is 2 digits, add prefix
      let year = parts[2];
      if (year.length === 2) {
        year = year < '50' ? `20${year}` : `19${year}`;
      }
      
      date = new Date(`${parts[0]}/${parts[1]}/${year}`);
    } else {
      // Try ISO format
      date = new Date(dateStr);
    }
    
    if (isNaN(date.getTime())) return '';
    
    // Format as YYYY-MM-DD
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  } catch (e) {
    console.error('Error formatting date:', e);
    return '';
  }
};

// Get active goals from the goals data
const getActiveGoalsFromData = (goalsData?: PatientGoals | null): string[] => {
  if (!goalsData) return [];
  
  return Object.entries(goalsData)
    .filter(([key, value]) => {
      // Skip non-goal properties
      if (key === 'client_id' || key === 'visit_date' || key === 'visit_id') return false;
      
      // Include active goals (value === 1)
      return value === 1;
    })
    .map(([key]) => GOAL_MAPPING[key] || '')
    .filter(Boolean);
};

const EditPatientForm = ({
  isOpen,
  onClose,
  onSubmit,
  patient,
  latestGoals
}: EditPatientFormProps) => {
  // All hooks must be at the top of your component
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Debug - log the patient data to see what we're working with
  console.log('Patient data received in form:', patient);
  console.log('Latest goals data:', latestGoals);
  
  // Format birth date for the date input
  const formattedBirthdate = formatDateForInput(patient.birthdate);
  console.log('Formatted birthdate:', formattedBirthdate);
  
  useEffect(() => {
    // Set active goals based on latestGoals data
    const activeGoals = getActiveGoalsFromData(latestGoals);
    console.log('Active goals:', activeGoals);
    setSelectedGoals(activeGoals);
  }, [latestGoals]);

  if (!isOpen) return null;


const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);
  
  try {
    const formData = new FormData(e.target as HTMLFormElement);
    
    // Format date for the API - backend expects MM/DD/YYYY
    const formatDateForAPI = (dateStr: string | null) => {
      if (!dateStr) return '';
      
      try {
        // Convert from YYYY-MM-DD to MM/DD/YYYY
        const [year, month, day] = dateStr.split('-');
        return `${month}/${day}/${year}`;
      } catch (e) {
        console.error('Error formatting date for API:', e);
        return dateStr; // Return original if conversion fails
      }
    };
    
    // Convert selected goals back to API format
    const goalsData: Record<string, number> = {};
    
    // Initialize all goals to 0
    for (const apiKey of Object.keys(GOAL_MAPPING)) {
      goalsData[apiKey] = 0;
    }
    
    // Set selected goals to 1
    for (const goal of selectedGoals) {
      // Find the API key for this goal
      const apiKey = Object.entries(GOAL_MAPPING)
        .find(([_, value]) => value === goal)?.[0];
      
      if (apiKey) {
        goalsData[apiKey] = 1;
      }
    }
    
    // Create the data object with snake_case keys to match the API expectations
    const data = {
      first_name: formData.get('firstName'),
      last_name: formData.get('lastName'),
      gender: formData.get('gender'),
      age: Number(formData.get('age')),
      race: formData.get('race'),
      primary_lang: formData.get('primaryLanguage'),
      insurance: formData.get('insurance'),
      phone: formData.get('phone'),
      zipcode: formData.get('zipCode'),
      height: formData.get('height'), // Corrected field name
      birthdate: formatDateForAPI(formData.get('birthdate') as string | null),
      // Maintain the client_id from the original patient
      client_id: patient.client_id,
      // Include goals data
      goals: goalsData
    };
    
    console.log('Submitting data:', data);
    onSubmit(data);
  } catch (err) {
    console.error('Error submitting form:', err);
    setError(err instanceof Error ? err.message : 'An error occurred while saving changes');
  } finally {
    setLoading(false);
  }
};

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal) 
        : [...prev, goal]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Edit Patient
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400">
            <XIcon size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>
                <input 
                  type="text" 
                  name="firstName" 
                  defaultValue={patient.first_name} 
                  required 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <input 
                  type="text" 
                  name="lastName" 
                  defaultValue={patient.last_name} 
                  required 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gender
                </label>
                <select 
                  name="gender" 
                  defaultValue={patient.gender} 
                  required 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Height
                </label>
                <input 
                  type="text" 
                  name="height" 
                  defaultValue={patient.height} 
                  required 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Age
                </label>
                <input 
                  type="number" 
                  name="age" 
                  defaultValue={patient.age} 
                  required 
                  min="0" 
                  max="150" 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Race
                </label>
                <select 
                  name="race" 
                  defaultValue={patient.race} 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Race</option>
                  {RACES.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Primary Language
                </label>
                <select 
                  name="primaryLanguage" 
                  defaultValue={patient.primary_lang} 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Language</option>
                  {LANGUAGES.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Insurance
                </label>
                <select 
                  name="insurance" 
                  defaultValue={patient.insurance} 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Insurance</option>
                  {INSURANCE_TYPES.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input 
                  type="tel" 
                  name="phone" 
                  defaultValue={patient.phone} 
                  pattern="[0-9()-\s]+" 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Zip Code
                </label>
                <input 
                  type="text" 
                  name="zipCode" 
                  defaultValue={patient.zipcode} 
                  pattern="[0-9]{5}" 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Birth Date
                </label>
                <input 
                  type="date" 
                  name="birthdate" 
                  defaultValue={formattedBirthdate} 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
              Health Goals
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {HEALTH_GOALS.map(goal => (
                <div key={goal} className="flex items-start space-x-3">
                  <input 
                    type="checkbox" 
                    id={goal} 
                    checked={selectedGoals.includes(goal)} 
                    onChange={() => toggleGoal(goal)} 
                    className="mt-1" 
                  />
                  <label htmlFor={goal} className="text-sm text-gray-700 dark:text-gray-300">
                    {goal}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
  <button 
    type="button" 
    onClick={onClose}
    disabled={loading}
    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
  >
    Cancel
  </button>
  <button 
    type="submit"
    disabled={loading}
    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
  >
    {loading ? (
      <>
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Saving...
      </>
    ) : "Save Changes"}
  </button>
</div>
        </form>
      </div>
    </div>
  );
};

export default EditPatientForm;