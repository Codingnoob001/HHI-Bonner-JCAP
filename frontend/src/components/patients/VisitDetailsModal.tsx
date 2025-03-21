import React from 'react';
import { XIcon } from 'lucide-react';

interface Visit {
  id: number;
  client_id: string;
  visit_date: string;
  visit_time?: string;
  event_type?: string;
  referral_source?: string;
  follow_up?: string;
  hra?: string;
  edu?: string;
  case_management?: string;
  systolic?: number;
  diastolic?: number;
  cholesterol?: number;
  fasting?: string;
  glucose?: number;
  height?: number;
  weight?: number;
  bmi?: number;
  a1c?: number;
  acquired_by?: string;
}

interface VisitDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Visit | null;
}

const VisitDetailsModal = ({
  isOpen,
  onClose,
  visit
}: VisitDetailsModalProps) => {
  if (!isOpen || !visit) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Visit Details
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400">
            <XIcon size={20} />
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Visit Date
              </label>
              <p className="mt-1 text-gray-900 dark:text-gray-100">
                {formatDate(visit.visit_date)}
              </p>
            </div>
            
            {visit.visit_time && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Visit Time
                </label>
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {visit.visit_time}
                </p>
              </div>
            )}
            
            {visit.event_type && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Event Type
                </label>
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {visit.event_type}
                </p>
              </div>
            )}
            
            {visit.referral_source && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Referral Source
                </label>
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {visit.referral_source}
                </p>
              </div>
            )}
            
            {visit.follow_up && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Follow Up
                </label>
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {visit.follow_up}
                </p>
              </div>
            )}
            
            {(visit.systolic !== undefined && visit.diastolic !== undefined) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Blood Pressure
                </label>
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {visit.systolic}/{visit.diastolic} mmHg
                </p>
              </div>
            )}
            
            {visit.cholesterol !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cholesterol
                </label>
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {visit.cholesterol} mg/dL
                </p>
              </div>
            )}
            
            {visit.glucose !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Glucose
                </label>
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {visit.glucose} mg/dL {visit.fasting === 'yes' && '(Fasting)'}
                </p>
              </div>
            )}
            
            {(visit.height || visit.weight) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Height & Weight
                </label>
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {visit.height !== undefined ? `${visit.height} (in)` : 'N/A'}, 
                  {visit.weight !== undefined ? ` ${visit.weight} lbs` : 'N/A'}
                </p>
              </div>
            )}
            
            {visit.bmi !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  BMI
                </label>
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {visit.bmi.toFixed(1)}
                </p>
              </div>
            )}
            
            {visit.a1c !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  A1C
                </label>
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {visit.a1c}%
                </p>
              </div>
            )}
            
            {visit.acquired_by && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Acquired By
                </label>
                <p className="mt-1 text-gray-900 dark:text-gray-100">
                  {visit.acquired_by}
                </p>
              </div>
            )}
            
            {(visit.hra || visit.edu || visit.case_management) && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Additional Notes
                </label>
                <div className="mt-1 space-y-2">
                  {visit.hra && (
                    <p className="text-gray-900 dark:text-gray-100">
                      <span className="font-medium">HRA:</span> {visit.hra}
                    </p>
                  )}
                  {visit.edu && (
                    <p className="text-gray-900 dark:text-gray-100">
                      <span className="font-medium">Education:</span> {visit.edu}
                    </p>
                  )}
                  {visit.case_management && (
                    <p className="text-gray-900 dark:text-gray-100">
                      <span className="font-medium">Case Management:</span>{' '}
                      {visit.case_management}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitDetailsModal;