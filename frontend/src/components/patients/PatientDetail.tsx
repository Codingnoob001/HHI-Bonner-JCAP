import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EditIcon, ArrowLeftIcon, PlusIcon } from 'lucide-react';
import NewVisitForm from './NewVisitForm';
import EditPatientForm from './EditPatientForm';
import VisitDetailsModal from './VisitDetailsModal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Toast from '../Toast';
import { patientApi } from '../../services/api';

interface Patient {
  client_id: string;
  first_name: string;
  last_name: string;
  age: number;
  gender: string;
  race?: string;
  primary_lang?: string;
  insurance?: string;
  phone?: string;
  zipcode?: string;
  height?: string;
  first_visit_date: string;
  birthdate: string;
}

interface Visit {
  id: number;
  client_id: string;
  visit_date: string;
  visit_time?: string;
  systolic?: number;
  diastolic?: number;
  cholesterol?: number;
  glucose?: number;
  weight?: number;
  bmi?: number;
  a1c?: number;
  acquired_by?: string;
}

interface PatientGoals {
  client_id: string;
  visit_date: string;
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
}

interface PatientDetailData {
  patient_info: Patient;
  latest_goals: PatientGoals | null;
  latest_changes: {
    systolic_change?: string;
    diastolic_change?: string;
    cholesterol_change?: string;
    glucose_change?: string;
    weight_change?: string;
    bmi_change?: string;
    a1c_change?: string;
    weight_percentage_change?: string;
  } | null;
  trend: Visit[];
}

const PatientDetail = () => {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  
  const [isNewVisitFormOpen, setIsNewVisitFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [isVisitDetailsOpen, setIsVisitDetailsOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  
  const [patientData, setPatientData] = useState<PatientDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch patient data from API
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!clientId) return;
      
      try {
        setLoading(true);
        const data = await patientApi.getPatientById(clientId);
        setPatientData(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch patient data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load patient data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [clientId]);

  const handleNewVisit = async (data: any) => {
    if (!clientId) return;
    
    try {
      console.log('Visit added:', data);
      
      setIsNewVisitFormOpen(false);
      
      setToastMessage({
        message: 'Visit added successfully',
        type: 'success'
      });
      
      setLoading(true);
      
      try {
        const updatedData = await patientApi.getPatientById(clientId);
        console.log('Refreshed patient data:', updatedData);
        
        setPatientData(updatedData);
      } catch (fetchErr) {
        console.error('Error fetching updated patient data:', fetchErr);
      } finally {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error adding visit:', err);
      setToastMessage({
        message: err instanceof Error ? err.message : 'Failed to add visit',
        type: 'error'
      });
    }
  };

  const handleEditPatient = async (data: any) => {
    if (!clientId) return;
    
    try {
      // Add debugging to see what's being sent to the API
      console.log('Submitting patient update data:', data);
      
      // Call the API to update the patient
      await patientApi.updatePatient(clientId, data);
      
      // Close the form
      setIsEditFormOpen(false);
      
      // Show success message
      setToastMessage({
        message: 'Patient updated successfully',
        type: 'success'
      });
      
      // Force a data refetch to see the changes
      setLoading(true);
      
      try {
        // Fetch the updated patient data
        const updatedData = await patientApi.getPatientById(clientId);
        console.log('Refreshed patient data:', updatedData);
        
        // Update the state with the new data
        setPatientData(updatedData);
      } catch (fetchErr) {
        console.error('Error fetching updated patient data:', fetchErr);
        // Still show success for the update operation
      } finally {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error updating patient:', err);
      setToastMessage({
        message: err instanceof Error ? err.message : 'Failed to update patient',
        type: 'error'
      });
    }
  };

  const formatChartData = () => {
    if (!patientData || !patientData.trend) return [];
    
    return patientData.trend.map(visit => {
      return {
        date: new Date(visit.visit_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
        systolic: visit.systolic,
        diastolic: visit.diastolic,
        weight: visit.weight,
        bmi: visit.bmi,
        glucose: visit.glucose,
        cholesterol: visit.cholesterol,
        a1c: visit.a1c
      };
    });
  };

  const chartData = formatChartData();

  const handleViewVisitDetails = async (visit: any) => {
    // Make sure clientId exists
    if (!clientId) {
      console.error('clientId is undefined');
      setSelectedVisit(visit);
      setIsVisitDetailsOpen(true);
      return;
    }
  
    try {
      // Now TypeScript knows clientId is not undefined
      const allVisits = await patientApi.getPatientVisits(clientId);
      
      // Find the full visit data
      const fullVisitData = allVisits.find((v: any) => v.id === visit.id);
      
      if (fullVisitData) {
        setSelectedVisit(fullVisitData);
      } else {
        setSelectedVisit(visit);
      }
      
      setIsVisitDetailsOpen(true);
    } catch (err) {
      console.error('Error fetching full visit details:', err);
      setSelectedVisit(visit);
      setIsVisitDetailsOpen(true);
    }
  };

  // Display active goals from latest_goals
  const getActiveGoals = () => {
    if (!patientData || !patientData.latest_goals) return [];
    
    const goals = [];
    const goalsMapping: Record<string, string> = {
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

    for (const [key, value] of Object.entries(patientData.latest_goals)) {
      if (key !== 'client_id' && key !== 'visit_date' && value === 1 && goalsMapping[key]) {
        goals.push(goalsMapping[key]);
      }
    }
    
    return goals;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !patientData) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 m-4">
        <p className="text-red-700 dark:text-red-400">{error || 'Failed to load patient data'}</p>
        <button 
          onClick={() => navigate(-1)} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  const patient = patientData.patient_info;
  const fullName = `${patient.first_name} ${patient.last_name}`;
  const activeGoals = getActiveGoals();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeftIcon size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
            Patient Details
          </h1>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setIsNewVisitFormOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center">
            <PlusIcon size={16} className="mr-1" /> New Visit
          </button>
          <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center">
            Print
          </button>
          <button onClick={() => setIsEditFormOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
            <EditIcon size={16} className="mr-1" /> Edit Patient
          </button>
        </div>
      </div>
      <EditPatientForm isOpen={isEditFormOpen} onClose={() => setIsEditFormOpen(false)} onSubmit={handleEditPatient} patient={patient} latestGoals={patientData.latest_goals}
/>
      <NewVisitForm isOpen={isNewVisitFormOpen} onClose={() => setIsNewVisitFormOpen(false)} onSubmit={handleNewVisit} clientId={patient.client_id} latestGoals={patientData.latest_goals}/>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex flex-col items-center mb-4">
              <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 text-2xl font-semibold mb-3">
                {`${patient.first_name[0]}${patient.last_name[0]}`}
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                {fullName}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Client ID: {patient.client_id}
              </p>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Age
                  </p>
                  <p className="font-medium">{patient.age}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Gender
                  </p>
                  <p className="font-medium">{patient.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Date of Birth
                  </p>
                  <p className="font-medium">
                    {formatDate(patient.birthdate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Phone
                  </p>
                  <p className="font-medium">{patient.phone || 'N/A'}</p>
                </div>
                {patient.race && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Race
                    </p>
                    <p className="font-medium">{patient.race}</p>
                  </div>
                )}
                {patient.height && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Height (in)
                    </p>
                    <p className="font-medium">{patient.height}</p>
                  </div>
                )}
                {patient.primary_lang && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Primary Language
                    </p>
                    <p className="font-medium">{patient.primary_lang}</p>
                  </div>
                )}
                {patient.zipcode && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Zip Code
                    </p>
                    <p className="font-medium">{patient.zipcode}</p>
                  </div>
                )}
                {patient.insurance && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Insurance
                    </p>
                    <p className="font-medium">{patient.insurance}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    First Visit Date
                  </p>
                  <p className="font-medium">{formatDate(patient.first_visit_date)}</p>
                </div>
              </div>
            </div>
          </div>

{patientData.latest_changes && (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mt-6">
    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
      Recent Changes
    </h3>
    <div className="grid grid-cols-2 gap-4">
      {patientData.latest_changes.systolic_change && (
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Systolic Blood Pressure
          </p>
          <p className={`font-medium ${
            patientData.latest_changes.systolic_change.startsWith('+') 
              ? 'text-red-600 dark:text-red-400' 
              : patientData.latest_changes.systolic_change.startsWith('-')
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-900 dark:text-gray-100'
          }`}>
            {patientData.latest_changes.systolic_change} mmHg
          </p>
        </div>
      )}
      
      {patientData.latest_changes.diastolic_change && (
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Diastolic Blood Pressure
          </p>
          <p className={`font-medium ${
            patientData.latest_changes.diastolic_change.startsWith('+') 
              ? 'text-red-600 dark:text-red-400' 
              : patientData.latest_changes.diastolic_change.startsWith('-')
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-900 dark:text-gray-100'
          }`}>
            {patientData.latest_changes.diastolic_change} mmHg
          </p>
        </div>
      )}
      
      {patientData.latest_changes.cholesterol_change && (
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Cholesterol
          </p>
          <p className={`font-medium ${
            patientData.latest_changes.cholesterol_change.startsWith('+') 
              ? 'text-red-600 dark:text-red-400' 
              : patientData.latest_changes.cholesterol_change.startsWith('-')
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-900 dark:text-gray-100'
          }`}>
            {patientData.latest_changes.cholesterol_change} mg/dL
          </p>
        </div>
      )}
      
      {patientData.latest_changes.glucose_change && (
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Blood Glucose
          </p>
          <p className={`font-medium ${
            patientData.latest_changes.glucose_change.startsWith('+') 
              ? 'text-red-600 dark:text-red-400' 
              : patientData.latest_changes.glucose_change.startsWith('-')
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-900 dark:text-gray-100'
          }`}>
            {patientData.latest_changes.glucose_change} mg/dL
          </p>
        </div>
      )}
      
      {patientData.latest_changes.weight_change && (
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Weight
          </p>
          <p className={`font-medium ${
            patientData.latest_changes.weight_change.startsWith('+') 
              ? 'text-red-600 dark:text-red-400' 
              : patientData.latest_changes.weight_change.startsWith('-')
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-900 dark:text-gray-100'
          }`}>
            {patientData.latest_changes.weight_change} lbs
            {patientData.latest_changes.weight_percentage_change && (
              <span className="ml-1 text-xs">
                ({patientData.latest_changes.weight_percentage_change})
              </span>
            )}
          </p>
        </div>
      )}
      
      {patientData.latest_changes.bmi_change && (
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            BMI
          </p>
          <p className={`font-medium ${
            patientData.latest_changes.bmi_change.startsWith('+') 
              ? 'text-red-600 dark:text-red-400' 
              : patientData.latest_changes.bmi_change.startsWith('-')
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-900 dark:text-gray-100'
          }`}>
            {patientData.latest_changes.bmi_change}
          </p>
        </div>
      )}
      
      {patientData.latest_changes.a1c_change && (
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            A1C
          </p>
          <p className={`font-medium ${
            patientData.latest_changes.a1c_change.startsWith('+') 
              ? 'text-red-600 dark:text-red-400' 
              : patientData.latest_changes.a1c_change.startsWith('-')
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-900 dark:text-gray-100'
          }`}>
            {patientData.latest_changes.a1c_change}%
          </p>
        </div>
      )}
    </div>
    
    {patientData.trend.length > 0 && (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Latest Metrics (as of {formatDate(patientData.trend[patientData.trend.length - 1]?.visit_date)})
        </p>
        <div className="grid grid-cols-2 gap-4">
          {patientData.trend[patientData.trend.length - 1]?.systolic && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Blood Pressure
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {patientData.trend[patientData.trend.length - 1]?.systolic}/
                {patientData.trend[patientData.trend.length - 1]?.diastolic} mmHg
              </p>
            </div>
          )}
          
          {patientData.trend[patientData.trend.length - 1]?.cholesterol && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Cholesterol
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {patientData.trend[patientData.trend.length - 1]?.cholesterol} mg/dL
              </p>
            </div>
          )}
          
          {patientData.trend[patientData.trend.length - 1]?.glucose && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Blood Glucose
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {patientData.trend[patientData.trend.length - 1]?.glucose} mg/dL
              </p>
            </div>
          )}
          
          {patientData.trend[patientData.trend.length - 1]?.weight && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Weight
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {patientData.trend[patientData.trend.length - 1]?.weight} kg
              </p>
            </div>
          )}
          
          {patientData.trend[patientData.trend.length - 1]?.bmi && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                BMI
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {patientData.trend[patientData.trend.length - 1]?.bmi.toFixed(1)}
              </p>
            </div>
          )}
          
          {patientData.trend[patientData.trend.length - 1]?.a1c && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                A1C
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {patientData.trend[patientData.trend.length - 1]?.a1c}%
              </p>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
)}
          
          {activeGoals.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mt-6">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
                Health Goals
              </h3>
              <div className="space-y-3">
                {activeGoals.map(goal => (
                  <div key={goal} className="flex items-start space-x-3">
                    <input type="checkbox" id={goal} checked className="mt-1" disabled />
                    <label htmlFor={goal} className="text-sm text-gray-700 dark:text-gray-300">
                      {goal}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="lg:col-span-2">
          {patientData.trend.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
                Health Metrics
              </h3>
              <div className="space-y-6">
                {/* Blood Pressure Chart */}
                {chartData.some(data => data.systolic && data.diastolic) && (
                  <div>
                    <h4 className="text-md font-medium text-gray-700 dark:text-gray-400 mb-2">
                      Blood Pressure
                    </h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="systolic" stroke="#3b82f6" name="Systolic" />
                          <Line type="monotone" dataKey="diastolic" stroke="#ef4444" name="Diastolic" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                {/* Weight Chart */}
                {chartData.some(data => data.weight) && (
                  <div>
                    <h4 className="text-md font-medium text-gray-700 dark:text-gray-400 mb-2">
                      Weight
                    </h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="weight" stroke="#10b981" name="Weight" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                {/* Glucose Chart */}
                {chartData.some(data => data.glucose) && (
                  <div>
                    <h4 className="text-md font-medium text-gray-700 dark:text-gray-400 mb-2">
                      Blood Glucose
                    </h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="glucose" stroke="#f59e0b" name="Glucose" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                {/* Cholesterol Chart */}
                {chartData.some(data => data.cholesterol) && (
                  <div>
                    <h4 className="text-md font-medium text-gray-700 dark:text-gray-400 mb-2">
                      Cholesterol
                    </h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="cholesterol" stroke="#8b5cf6" name="Cholesterol" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                {/* A1C Chart */}
                {chartData.some(data => data.a1c) && (
                  <div>
                    <h4 className="text-md font-medium text-gray-700 dark:text-gray-400 mb-2">
                      A1C
                    </h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="a1c" stroke="#ec4899" name="A1C" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
              Visit History
            </h3>
            {patientData.trend.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No visit data available. Add a new visit to start tracking health metrics.
              </p>
            ) : (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Visit Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Blood Pressure
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Weight
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        BMI
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {patientData.trend.map((visit) => (
                      <tr key={visit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(visit.visit_date)}
                          {visit.visit_time && ` ${visit.visit_time}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {visit.systolic && visit.diastolic ? `${visit.systolic}/${visit.diastolic}` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {visit.weight ? `${visit.weight} lbs` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {visit.bmi ? visit.bmi.toFixed(1) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button onClick={() => handleViewVisitDetails(visit)} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <VisitDetailsModal isOpen={isVisitDetailsOpen} onClose={() => setIsVisitDetailsOpen(false)} visit={selectedVisit} />
      {toastMessage && <Toast message={toastMessage.message} type={toastMessage.type} onClose={() => setToastMessage(null)} />}
    </div>
  );
};

export default PatientDetail;