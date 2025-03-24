import React, { useState } from 'react';
import { XIcon } from 'lucide-react';
import { patientApi } from '../../services/api';
import { useEffect } from 'react';

interface NewVisitFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  clientId: string;
  latestGoals?: any;
}

const EVENT_TYPES = [
  { value: 'HRA', label: 'HRA' },
  { value: 'LOS AMIGOS', label: 'LOS AMIGOS' },
  { value: 'HEALTH FAIR', label: 'HEALTH FAIR' },
  { value: 'HRA/LOS AMIGOS', label: 'HRA/LOS AMIGOS' },
  { value: 'H.F. / Los Amigos', label: 'H.F. / Los Amigos' },
  { value: 'HRA/HEALTH FAIR', label: 'HRA/HEALTH FAIR' },
  { value: 'H.F. / HRA / Los Amigos', label: 'H.F. / HRA / Los Amigos' }
];

const REFERRAL_SOURCES = [
  { value: 'FLYER/POSTER', label: 'FLYER/POSTER' },
  { value: 'REFERRAL', label: 'REFERRAL' },
  { value: 'WALK-IN', label: 'WALK-IN' },
  { value: 'MEDIA', label: 'MEDIA' },
  { value: 'FRIEND', label: 'FRIEND' },
  { value: 'OTHER', label: 'OTHER' }
];

const FOLLOW_UP_OPTIONS = [
  { value: 'COMPLIANT', label: 'Compliant' },
  { value: 'NON-COMPLIANT', label: 'Non-compliant' }
];

const FASTING_OPTIONS = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' }
];

const ACQUIRED_BY_OPTIONS = [
  { value: 'SELF-REPORTED', label: 'SELF-REPORTED' },
  { value: 'RESCREENED', label: 'RESCREENED' },
  { value: 'EDUCATION', label: 'EDUCATION' }
];

// Mapping for health goals data
const GOALS_MAPPING = {
  increased_fruit_veg: 'Increase Fruit & Vegetable Intake',
  increased_water: 'Increase Water Intake',
  increased_exercise: 'Increase Physical Activity',
  cut_tv_viewing: 'Reduce Screen Time',
  eat_breakfast: 'Eat Breakfast Daily',
  limit_alcohol: 'Limit Alcohol Consumption',
  no_late_eating: 'Avoid Late Night Eating',
  more_whole_grains: 'Eat More Whole Grains',
  less_fried_foods: 'Reduce Fried Food Consumption',
  low_fat_milk: 'Use Low-Fat Dairy Products',
  lower_salt: 'Reduce Salt Intake',
  annual_checkup: 'Schedule Annual Check-up',
  quit_smoking: 'Quit Smoking'
};

const NewVisitForm = ({
  isOpen,
  onClose,
  onSubmit,
  clientId,
  latestGoals
}: NewVisitFormProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  useEffect(() => {
    if (latestGoals) {
      const activeGoals = Object.entries(latestGoals)
        .filter(([key, value]) => {
          if (key === 'client_id' || key === 'visit_date' || key === 'visit_id') return false;
          
          return value === 1;
        })
        .map(([key]) => {
          return GOALS_MAPPING[key as keyof typeof GOALS_MAPPING] || '';
        })
        .filter(Boolean);
      
      setSelectedGoals(activeGoals);
    }
  }, [latestGoals]);
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.target as HTMLFormElement);

      // Format date from YYYY-MM-DD to the format expected by the API
      const formatDateForAPI = (dateStr: string | null) => {
        if (!dateStr) return '';
        
        // Convert from YYYY-MM-DD to MM/DD/YYYY
        const [year, month, day] = dateStr.split('-');
        return `${month}/${day}/${year}`;
      };

      // Prepare goals data if selected
      const goalsData: Record<string, number> = {};
      
      // Set all goals to 0 initially
      Object.keys(GOALS_MAPPING).forEach(key => {
        goalsData[key] = 0;
      });
      
      // Set selected goals to 1
      selectedGoals.forEach(goalDisplayName => {
        const apiKey = Object.entries(GOALS_MAPPING).find(
          ([_, value]) => value === goalDisplayName
        )?.[0];
        
        if (apiKey) {
          goalsData[apiKey] = 1;
        }
      });

      // Create the data object with snake_case keys to match the API expectations
      const visitData = {
        client_id: clientId,
        visit_date: formatDateForAPI(formData.get('visitDate') as string | null),
        visit_time: formData.get('visitTime') || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        event_type: formData.get('eventType'),
        referral_source: formData.get('referralSource'),
        follow_up: formData.get('followUp'),
        hra: formData.get('hra'),
        edu: formData.get('edu'),
        case_management: formData.get('caseManagement'),
        systolic: formData.get('systolic') ? Number(formData.get('systolic')) : null,
        diastolic: formData.get('diastolic') ? Number(formData.get('diastolic')) : null,
        cholesterol: formData.get('cholesterol') ? Number(formData.get('cholesterol')) : null,
        fasting: formData.get('fasting'),
        glucose: formData.get('glucose') ? Number(formData.get('glucose')) : null,
        height: formData.get('height') ? Number(formData.get('height')) : null,
        weight: formData.get('weight') ? Number(formData.get('weight')) : null,
        a1c: formData.get('a1c') ? Number(formData.get('a1c')) : null,
        acquired_by: formData.get('acquiredBy'),
        goals: Object.keys(goalsData).length > 0 ? goalsData : undefined
      };

      console.log('Submitting visit data:', visitData);
      
      // Call the API to create the visit
      const result = await patientApi.addPatientVisit(clientId, visitData);
      console.log('API response:', result);
      
      // Call the onSubmit callback from props
      onSubmit(result);
      
    } catch (err) {
      console.error('Error adding visit:', err);
      setError(err instanceof Error ? err.message : 'Failed to add visit');
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
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Add New Visit
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400">
            <XIcon size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Visit Date
              </label>
              <input 
                type="date" 
                name="visitDate" 
                required 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Visit Time
              </label>
              <input 
                type="time" 
                name="visitTime" 
                defaultValue={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Event Type
              </label>
              <select 
                name="eventType" 
                required 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Event Type</option>
                {EVENT_TYPES.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Referral Source
              </label>
              <select 
                name="referralSource" 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Referral Source</option>
                {REFERRAL_SOURCES.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Follow Up
              </label>
              <select 
                name="followUp" 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Follow Up Status</option>
                {FOLLOW_UP_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                HRA
              </label>
              <input 
                type="text" 
                name="hra" 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Education
              </label>
              <input 
                type="text" 
                name="edu" 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Case Management
              </label>
              <input 
                type="text" 
                name="caseManagement" 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Blood Pressure (Systolic)
              </label>
              <input 
                type="number" 
                name="systolic" 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Blood Pressure (Diastolic)
              </label>
              <input 
                type="number" 
                name="diastolic" 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cholesterol
              </label>
              <input 
                type="number" 
                name="cholesterol" 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fasting
              </label>
              <select 
                name="fasting" 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Fasting Status</option>
                {FASTING_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Glucose
              </label>
              <input 
                type="number" 
                name="glucose" 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Height (m)
              </label>
              <input 
                type="number" 
                name="height" 
                step="0.01" 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Weight (lbs)
              </label>
              <input 
                type="number" 
                name="weight" 
                step="0.1" 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                A1C
              </label>
              <input 
                type="number" 
                name="a1c" 
                step="0.1" 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Acquired By
              </label>
              <select 
                name="acquiredBy" 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Acquisition Method</option>
                {ACQUIRED_BY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Health Goals Section */}
          <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
              Health Goals
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(GOALS_MAPPING).map(([key, value]) => (
                <div key={key} className="flex items-start space-x-3">
                  <input 
                    type="checkbox" 
                    id={key} 
                    checked={selectedGoals.includes(value)} 
                    onChange={() => toggleGoal(value)} 
                    className="mt-1" 
                  />
                  <label htmlFor={key} className="text-sm text-gray-700 dark:text-gray-300">
                    {value}
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
              ) : "Add Visit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewVisitForm;