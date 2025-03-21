import React from 'react';
import { UserIcon, DollarSignIcon, ClipboardIcon } from 'lucide-react';
const RecentActivity = () => {
  const activities = [{
    id: 2,
    type: 'new-registration',
    patient: 'Robert Williams',
    time: '09:15 AM',
    icon: <UserIcon size={16} className="text-green-500" />
  }, {
    id: 3,
    type: 'payment',
    patient: 'Emily Davis',
    amount: '$250.00',
    time: 'Yesterday',
    icon: <DollarSignIcon size={16} className="text-green-500" />
  }, {
    id: 4,
    type: 'visit',
    patient: 'James Wilson',
    doctor: 'Dr. Lisa Wong',
    time: 'Yesterday',
    icon: <ClipboardIcon size={16} className="text-blue-500" />
  }, {
    id: 5,
    type: 'payment',
    patient: 'Thomas Brown',
    amount: '$185.50',
    time: '2 days ago',
    icon: <DollarSignIcon size={16} className="text-green-500" />
  }];
  return <div className="space-y-4">
      {activities.map(activity => <div key={activity.id} className="flex items-start p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-2 mr-3">
            {activity.icon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {activity.type === 'visit' && <>
                  Patient visit:{' '}
                  <span className="font-semibold">{activity.patient}</span> with{' '}
                  {activity.doctor}
                </>}
              {activity.type === 'new-registration' && <>
                  New patient registered:{' '}
                  <span className="font-semibold">{activity.patient}</span>
                </>}
              {activity.type === 'payment' && <>
                  Payment received:{' '}
                  <span className="font-semibold">{activity.amount}</span> from{' '}
                  {activity.patient}
                </>}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {activity.time}
            </p>
          </div>
        </div>)}
      <button className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:text-blue-800 dark:hover:text-blue-300">
        View all activity
      </button>
    </div>;
};
export default RecentActivity;