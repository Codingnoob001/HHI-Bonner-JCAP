import React from 'react';
import { ChevronRightIcon } from 'lucide-react';
const AppointmentCalendar = () => {
  const appointments = [{
    id: 1,
    time: '09:00 AM',
    patient: 'Maria Garcia',
    type: 'Check-up',
    status: 'confirmed'
  }, {
    id: 2,
    time: '10:30 AM',
    patient: 'John Smith',
    type: 'Follow-up',
    status: 'confirmed'
  }, {
    id: 3,
    time: '11:45 AM',
    patient: 'David Lee',
    type: 'Consultation',
    status: 'confirmed'
  }, {
    id: 4,
    time: '01:30 PM',
    patient: 'Susan Taylor',
    type: 'Check-up',
    status: 'pending'
  }, {
    id: 5,
    time: '03:00 PM',
    patient: 'Michael Johnson',
    type: 'Follow-up',
    status: 'confirmed'
  }];
  const statusClasses = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  return <div className="space-y-3">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm font-medium text-gray-500">
          Today, {new Date().toLocaleDateString()}
        </p>
        <button className="text-sm text-blue-600 font-medium hover:text-blue-800 flex items-center">
          Full Calendar <ChevronRightIcon size={16} className="ml-1" />
        </button>
      </div>
      <div className="space-y-2">
        {appointments.map(appointment => <div key={appointment.id} className="flex items-center p-3 border border-gray-100 rounded-md hover:bg-gray-50">
            <div className="w-16 text-sm font-medium text-gray-500">
              {appointment.time}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">
                {appointment.patient}
              </p>
              <p className="text-xs text-gray-500">{appointment.type}</p>
            </div>
            <div className={`text-xs px-2 py-1 rounded-full ${statusClasses[appointment.status]}`}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </div>
          </div>)}
      </div>
    </div>;
};
export default AppointmentCalendar;