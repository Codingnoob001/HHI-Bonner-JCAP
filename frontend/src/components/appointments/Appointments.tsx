import React, { useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  FilterIcon,
} from "lucide-react";
const Appointments = () => {
  const [view, setView] = useState("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const timeSlots = Array.from(
    {
      length: 12,
    },
    (_, i) => i + 8,
  ); // 8 AM to 7 PM
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  // Mock appointment data
  const appointments = [
    {
      id: 1,
      patientName: "Sarah Johnson",
      day: "Mon",
      startTime: 9,
      endTime: 10,
      type: "Check-up",
      status: "confirmed",
    },
    {
      id: 2,
      patientName: "Michael Williams",
      day: "Mon",
      startTime: 11,
      endTime: 12,
      type: "Follow-up",
      status: "confirmed",
    },
    {
      id: 3,
      patientName: "Emma Davis",
      day: "Tue",
      startTime: 10,
      endTime: 11,
      type: "Consultation",
      status: "confirmed",
    },
    {
      id: 4,
      patientName: "James Wilson",
      day: "Wed",
      startTime: 14,
      endTime: 15,
      type: "Check-up",
      status: "pending",
    },
    {
      id: 5,
      patientName: "Olivia Martinez",
      day: "Thu",
      startTime: 13,
      endTime: 14,
      type: "Follow-up",
      status: "confirmed",
    },
    {
      id: 6,
      patientName: "Robert Brown",
      day: "Fri",
      startTime: 15,
      endTime: 16,
      type: "Consultation",
      status: "confirmed",
    },
  ];
  const statusColors = {
    confirmed: "bg-green-100 border-green-200 text-green-800",
    pending: "bg-yellow-100 border-yellow-200 text-yellow-800",
    cancelled: "bg-red-100 border-red-200 text-red-800",
  };
  const goToPreviousPeriod = () => {
    const newDate = new Date(currentDate);
    if (view === "day") {
      newDate.setDate(newDate.getDate() - 1);
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else if (view === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };
  const goToNextPeriod = () => {
    const newDate = new Date(currentDate);
    if (view === "day") {
      newDate.setDate(newDate.getDate() + 1);
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else if (view === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };
  const formatDateRange = () => {
    const options = {
      month: "short",
      day: "numeric",
    };
    if (view === "day") {
      return currentDate.toLocaleDateString("en-US", {
        ...options,
        year: "numeric",
      });
    } else if (view === "week") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString("en-US", options)} - ${endOfWeek.toLocaleDateString("en-US", options)}, ${currentDate.getFullYear()}`;
    } else if (view === "month") {
      return currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Appointments</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center">
          <PlusIcon size={16} className="mr-1" /> New Appointment
        </button>
      </div>
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none"
              onClick={goToPreviousPeriod}
            >
              <ChevronLeftIcon size={20} />
            </button>
            <h2 className="text-lg font-medium text-gray-800 min-w-[200px] text-center">
              {formatDateRange()}
            </h2>
            <button
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none"
              onClick={goToNextPeriod}
            >
              <ChevronRightIcon size={20} />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                onClick={() => setView("day")}
                className={`px-4 py-2 text-sm font-medium ${view === "day" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"} border rounded-l-md focus:z-10 focus:outline-none`}
              >
                Day
              </button>
              <button
                onClick={() => setView("week")}
                className={`px-4 py-2 text-sm font-medium ${view === "week" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"} border-t border-b border-r focus:z-10 focus:outline-none`}
              >
                Week
              </button>
              <button
                onClick={() => setView("month")}
                className={`px-4 py-2 text-sm font-medium ${view === "month" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"} border rounded-r-md focus:z-10 focus:outline-none`}
              >
                Month
              </button>
            </div>
            <button className="px-3 py-2 border border-gray-300 rounded-md flex items-center text-gray-700 hover:bg-gray-50">
              <FilterIcon size={16} className="mr-1" /> Filter
            </button>
          </div>
        </div>
        <div className="p-4">
          {view === "week" && (
            <div className="flex flex-col">
              <div className="flex border-b">
                <div className="w-16 flex-shrink-0"></div>
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="flex-1 text-center p-2 font-medium text-gray-800"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="flex flex-col">
                {timeSlots.map((time) => (
                  <div key={time} className="flex border-b last:border-b-0">
                    <div className="w-16 flex-shrink-0 py-3 px-2 text-right text-xs text-gray-500">
                      {time % 12 === 0 ? 12 : time % 12}:00{" "}
                      {time < 12 ? "AM" : "PM"}
                    </div>
                    {weekDays.map((day) => {
                      const dayAppointments = appointments.filter(
                        (app) => app.day === day && app.startTime === time,
                      );
                      return (
                        <div
                          key={day}
                          className="flex-1 border-l p-1 min-h-[60px]"
                        >
                          {dayAppointments.map((appointment) => (
                            <div
                              key={appointment.id}
                              className={`p-2 text-xs rounded-md border mb-1 cursor-pointer ${statusColors[appointment.status]}`}
                            >
                              <div className="font-medium">
                                {appointment.patientName}
                              </div>
                              <div>{appointment.type}</div>
                              <div>
                                {appointment.startTime % 12 === 0
                                  ? 12
                                  : appointment.startTime % 12}
                                :00
                                {appointment.startTime < 12 ? "AM" : "PM"} -
                                {appointment.endTime % 12 === 0
                                  ? 12
                                  : appointment.endTime % 12}
                                :00
                                {appointment.endTime < 12 ? "AM" : "PM"}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
          {view === "day" && (
            <div className="flex flex-col">
              <div className="text-center p-2 font-medium text-gray-800 border-b">
                {currentDate.toLocaleDateString("en-US", {
                  weekday: "long",
                })}
              </div>
              <div className="flex flex-col">
                {timeSlots.map((time) => (
                  <div key={time} className="flex border-b last:border-b-0">
                    <div className="w-16 flex-shrink-0 py-3 px-2 text-right text-xs text-gray-500">
                      {time % 12 === 0 ? 12 : time % 12}:00{" "}
                      {time < 12 ? "AM" : "PM"}
                    </div>
                    <div className="flex-1 p-1 min-h-[80px]">
                      {/* Day view appointments would go here */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {view === "month" && (
            <div className="grid grid-cols-7 gap-2">
              {/* Month headers */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center p-2 font-medium text-gray-800"
                >
                  {day}
                </div>
              ))}
              {/* Month days */}
              {Array.from(
                {
                  length: 35,
                },
                (_, i) => (
                  <div
                    key={i}
                    className="border rounded-md h-32 p-1 overflow-y-auto"
                  >
                    <div className="text-right text-xs text-gray-500 mb-1">
                      {i + 1}
                    </div>
                    {/* Month view appointments would go here */}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Appointments;
