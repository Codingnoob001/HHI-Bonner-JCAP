import React from "react";
import { PaletteIcon } from "lucide-react";
import { useTheme } from "../ThemeContext";
const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
        Settings
      </h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex">
            <button className="px-4 py-3 flex items-center text-sm font-medium border-b-2 border-blue-500 text-blue-600 dark:text-blue-400">
              <PaletteIcon size={16} className="mr-2" />
              Appearance
            </button>
          </nav>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
              Theme Settings
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Customize the appearance of the application
            </p>
            <div className="flex items-center justify-between py-3">
              <div>
                <h3 className="font-medium text-gray-800 dark:text-gray-200">
                  Dark Mode
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Toggle between light and dark theme
                </p>
              </div>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={theme === "dark"}
                    onChange={toggleTheme}
                  />
                  <div className="w-14 h-7 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div
                    className={`absolute w-7 h-7 rounded-full shadow transition-transform ${theme === "dark" ? "transform translate-x-7 bg-blue-600" : "bg-white"}`}
                    style={{
                      top: "0",
                    }}
                  ></div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Settings;
