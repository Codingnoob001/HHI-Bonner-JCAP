import React from 'react';
import { PlusIcon, SearchIcon } from 'lucide-react';
const DoctorsStaff = () => {
  const staff = [{
    id: 1,
    name: 'Dr. Michael Chen',
    role: 'Physician',
    department: 'Internal Medicine',
    email: 'michael.chen@example.com',
    phone: '(555) 123-4567',
    status: 'active'
  }, {
    id: 2,
    name: 'Dr. Lisa Wong',
    role: 'Physician',
    department: 'Pediatrics',
    email: 'lisa.wong@example.com',
    phone: '(555) 234-5678',
    status: 'active'
  }, {
    id: 3,
    name: 'Dr. James Wilson',
    role: 'Physician',
    department: 'Cardiology',
    email: 'james.wilson@example.com',
    phone: '(555) 345-6789',
    status: 'active'
  }, {
    id: 4,
    name: 'Sarah Miller',
    role: 'Nurse Practitioner',
    department: 'Internal Medicine',
    email: 'sarah.miller@example.com',
    phone: '(555) 456-7890',
    status: 'active'
  }, {
    id: 5,
    name: 'Robert Johnson',
    role: 'Registered Nurse',
    department: 'Emergency',
    email: 'robert.johnson@example.com',
    phone: '(555) 567-8901',
    status: 'on leave'
  }, {
    id: 6,
    name: 'Jennifer Lee',
    role: 'Medical Assistant',
    department: 'Pediatrics',
    email: 'jennifer.lee@example.com',
    phone: '(555) 678-9012',
    status: 'active'
  }, {
    id: 7,
    name: 'David Brown',
    role: 'Receptionist',
    department: 'Administration',
    email: 'david.brown@example.com',
    phone: '(555) 789-0123',
    status: 'active'
  }, {
    id: 8,
    name: 'Emily Davis',
    role: 'Billing Specialist',
    department: 'Administration',
    email: 'emily.davis@example.com',
    phone: '(555) 890-1234',
    status: 'active'
  }];
  const statusClasses = {
    active: 'bg-green-100 text-green-800',
    'on leave': 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-red-100 text-red-800'
  };
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">
          Doctors & Staff
        </h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center">
          <PlusIcon size={16} className="mr-1" /> Add Staff Member
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <input type="text" placeholder="Search staff..." className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <SearchIcon size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          <div className="flex items-center space-x-2">
            <select className="px-3 py-2 border border-gray-300 rounded-md text-gray-700">
              <option value="all">All Departments</option>
              <option value="internal-medicine">Internal Medicine</option>
              <option value="pediatrics">Pediatrics</option>
              <option value="cardiology">Cardiology</option>
              <option value="emergency">Emergency</option>
              <option value="administration">Administration</option>
            </select>
            <select className="px-3 py-2 border border-gray-300 rounded-md text-gray-700">
              <option value="all">All Roles</option>
              <option value="physician">Physician</option>
              <option value="nurse">Nurse</option>
              <option value="assistant">Assistant</option>
              <option value="admin">Administrative</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
          {staff.map(member => <div key={member.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-semibold">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusClasses[member.status]}`}>
                    {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                  </span>
                </div>
                <h3 className="font-medium text-gray-800">{member.name}</h3>
                <p className="text-sm text-gray-600">{member.role}</p>
                <p className="text-xs text-gray-500">{member.department}</p>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-600">{member.email}</p>
                  <p className="text-xs text-gray-600">{member.phone}</p>
                </div>
                <div className="mt-4 flex justify-between">
                  <button className="text-sm text-blue-600 hover:text-blue-800">
                    View Profile
                  </button>
                  <button className="text-sm text-gray-600 hover:text-gray-800">
                    Edit
                  </button>
                </div>
              </div>
            </div>)}
        </div>
      </div>
    </div>;
};
export default DoctorsStaff;