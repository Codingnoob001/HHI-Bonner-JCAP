import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { MenuIcon } from "lucide-react";
import SearchBar from "./SearchBar"; // Import our new SearchBar component

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-white dark:bg-gray-800 shadow-sm z-20">
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
            >
              <MenuIcon size={24} />
            </button>

            <div className="flex-1 max-w-2xl px-4">
              <SearchBar />
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
                <button className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </button>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white font-medium">
                DR
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
