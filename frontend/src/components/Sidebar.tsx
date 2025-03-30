import React from "react";
import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  UsersIcon,
  CreditCardIcon,
  BarChartIcon,
  SettingsIcon,
  FileTextIcon,
} from "lucide-react";
const Sidebar = ({ collapsed }) => {
  const navItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <HomeIcon size={20} />,
    },
    {
      name: "Patient Records",
      path: "/patients",
      icon: <UsersIcon size={20} />,
    },
    {
      name: "Billing & Payments",
      path: "/billing",
      icon: <CreditCardIcon size={20} />,
    },
    {
      name: "Reports & Analytics",
      path: "/reports",
      icon: <BarChartIcon size={20} />,
    },
    {
      name: "Financial Reports",
      path: "/financial-reports",
      icon: <FileTextIcon size={20} />,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: <SettingsIcon size={20} />,
    },
  ];
  return (
    <aside
      className={`${collapsed ? "w-16" : "w-64"} bg-white dark:bg-gray-800 shadow-md transition-all duration-300 ease-in-out overflow-y-auto`}
    >
      <div
        className={`flex items-center h-16 px-4 ${collapsed ? "justify-center" : "justify-start"}`}
      >
        {collapsed ? (
          <div className="h-8 w-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-bold">
            H
          </div>
        ) : (
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-bold mr-2">
              H
            </div>
            <span className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              HHI 
            </span>
          </div>
        )}
      </div>
      <nav className="mt-6">
        <ul>
          {navItems.map((item) => (
            <li key={item.path} className="px-2 py-1">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 rounded-md transition-colors ${isActive ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`
                }
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="ml-3">{item.name}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};
export default Sidebar;
