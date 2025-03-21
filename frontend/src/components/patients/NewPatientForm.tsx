import React, { useState } from 'react';
import { XIcon } from 'lucide-react';
import { patientApi } from '../../services/api';

interface NewPatientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

// Goal mapping between display names and API keys
const GOAL_MAPPING: Record<string, string> = {
  'INCREASED DAILY FRUIT/ VEGETABLE PORTIONS': 'increased_fruit_veg',
  'INCREASE DAILY WATER INTAKE': 'increased_water',
  'INCREASED WEEKLY EXERCISE': 'increased_exercise',
  'CUT TV VIEWING TO < 2 HOURS/ DAY': 'cut_tv_viewing',
  'EAT BREAKFAST DAILY': 'eat_breakfast',
  'LIMIT DAILY ALCOHOL CONSUMPTION WOMAN =1, MAN=2': 'limit_alcohol',
  'DO NOT EAT AT LEAST 3 HOURS BEFORE GOING TO BED': 'no_late_eating',
  'EATS MORE WHOLE WHEAT/ GRAINS DAILY': 'more_whole_grains',
  'EATS LESS FRIED FOODS OR MEATS': 'less_fried_foods',
  'DRINKS LOW FAT OR SKIM MILK': 'low_fat_milk',
  'LOWERED SALT INTAKE': 'lower_salt',
  'RECEIVE AN ANNUAL CHECK-UP': 'annual_checkup',
  'QUIT SMOKING': 'quit_smoking'
};

const HEALTH_GOALS = Object.keys(GOAL_MAPPING);

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

const NewPatientForm = ({
  isOpen,
  onClose,
  onSubmit
}: NewPatientFormProps) => {
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      
      // Convert the form data to the format expected by the API
      const formattedDate = (dateStr: string | null) => {
        if (!dateStr) return '';
        // Format YYYY-MM-DD to MM/DD/YYYY for API
        const [year, month, day] = dateStr.split('-');
        return `${month}/${day}/${year}`;
      };

      // Convert selected goals to API format
      const goals: Record<string, number> = {};
      for (const apiKey of Object.values(GOAL_MAPPING)) {
        goals[apiKey] = 0; // Initialize all goals to 0
      }

      // Set selected goals to 1
      for (const displayGoal of selectedGoals) {
        const apiKey = GOAL_MAPPING[displayGoal];
        if (apiKey) {
          goals[apiKey] = 1;
        }
      }
      
      // Create the data payload for the API
      const apiData = {
        first_name: formData.get('firstName'),
        last_name: formData.get('lastName'),
        gender: formData.get('gender'),
        age: Number(formData.get('age')),
        race: formData.get('race'),
        primary_lang: formData.get('primaryLanguage'),
        insurance: formData.get('insurance'),
        phone: formData.get('phone'),
        zipcode: formData.get('zipcode'),
        height: formData.get('height'),
        birthdate: formattedDate(formData.get('birthdate') as string | null),
        first_visit_date: formattedDate(formData.get('firstVisitDate') as string | null),
        goals: goals
      };

      console.log('Submitting patient data:', apiData);
      
      // Call the API to create the patient
      const result = await patientApi.createPatient(apiData);
      console.log('API response:', result);
      
      // Call the onSubmit callback from props
      onSubmit(result);
      
    } catch (err) {
      console.error('Error adding patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to add patient');
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
            Add New Patient
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400">
            <XIcon size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
          
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>
                <input type="text" name="firstName" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <input type="text" name="lastName" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gender
                </label>
                <select name="gender" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Height (in)
                </label>
                <input type="text" name="height" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Age
                </label>
                <input type="number" name="age" required min="0" max="150" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Race
                </label>
                <select name="race" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                <select name="primaryLanguage" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                <select name="insurance" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                <input type="tel" name="phone" required pattern="[0-9()-\s]+" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Zip Code
                </label>
                <input type="text" name="zipcode" required pattern="[0-9]{5}" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Visit Date
                </label>
                <input type="date" name="firstVisitDate" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Birth Date
                </label>
                <input type="date" name="birthdate" required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                  Adding...
                </>
              ) : "Add Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPatientForm;