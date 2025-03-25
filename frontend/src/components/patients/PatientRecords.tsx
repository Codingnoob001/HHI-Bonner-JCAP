import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  PlusIcon,
  SearchIcon,
  FilterIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import NewPatientForm from "./NewPatientForm";
import EditPatientForm from "./EditPatientForm";
import DeleteConfirmationModal from "../DeleteConfirmationModal";
import Toast from "../Toast";
import { patientApi } from "../../services/api";

interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
  lastVisit: string;
  race?: string;
  nextAppointment: string;
  contact: string;
}

const PatientRecords = () => {
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [isNewPatientFormOpen, setIsNewPatientFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    total: number;
    page: number;
    limit: number;
    pages: number;
  }>({
    total: 0,
    page: 1,
    limit: 100,
    pages: 0,
  });

  // Fetch patients data
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const data = await patientApi.getPatients(
          pagination.page,
          pagination.limit,
        );

        // Transform the data to match our Patient interface
        const transformedPatients = data.patients.map((patient: any) => ({
          id: patient.client_id, // Use client_id as the primary identifier
          name: `${patient.first_name} ${patient.last_name}`,
          age: patient.age,
          gender: patient.gender,
          lastVisit: patient.first_visit_date,
          nextAppointment: "",
          contact: patient.phone || "N/A",
        }));

        setPatients(transformedPatients);
        setPagination(data.pagination);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch patients:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load patients. Please try again later.",
        );
        // Keep some sample data for development
        if (process.env.NODE_ENV === "development") {
          setPatients([
            {
              id: "SAMPLE1",
              name: "Sarah Johnson",
              age: 42,
              gender: "Female",
              lastVisit: "2023-06-15",
              nextAppointment: "2023-08-20",
              contact: "(555) 123-4567",
            },
          ]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [pagination.page, pagination.limit]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filterPatients = useCallback((patients: Patient[], query: string) => {
    if (!query.trim()) return patients;
    const searchTerm = query.toLowerCase().trim();
    return patients.filter((patient) => {
      return (
        patient.name.toLowerCase().includes(searchTerm) ||
        patient.gender.toLowerCase().includes(searchTerm) ||
        patient.contact.toLowerCase().includes(searchTerm) ||
        patient.age.toString().includes(searchTerm)
      );
    });
  }, []);

  const filteredAndSortedPatients = useMemo(() => {
    const filtered = filterPatients(patients, searchQuery);
    return [...filtered].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [patients, searchQuery, sortField, sortDirection, filterPatients]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      return dateStr; // Return original string if parsing fails
    }
  };

  const handleNewPatientSubmit = async (data: any) => {
    try {
      // The API call is now handled inside the NewPatientForm component
      console.log("New patient added:", data);

      // First close the form
      setIsNewPatientFormOpen(false);

      // Show success message
      setToastMessage({
        message: "Patient added successfully",
        type: "success",
      });

      // Force a data refetch by setting loading to true
      setLoading(true);

      try {
        // Fetch the updated patient list
        const data = await patientApi.getPatients(1, pagination.limit); // Always go to first page to see new patient

        // Update the patient data and pagination
        const transformedPatients = data.patients.map((patient: any) => ({
          id: patient.client_id, // Use client_id as the primary identifier
          name: `${patient.first_name} ${patient.last_name}`,
          age: patient.age,
          gender: patient.gender,
          lastVisit: patient.first_visit_date,
          nextAppointment: "", // This field might need a different API endpoint
          contact: patient.phone || "N/A",
        }));

        setPatients(transformedPatients);
        setPagination({
          ...data.pagination,
          page: 1, // Force to first page to see new patient
        });
      } catch (fetchErr) {
        console.error("Error fetching updated patient list:", fetchErr);
        // Still show success message for the add operation
      } finally {
        setLoading(false);
      }
    } catch (err) {
      console.error("Error handling patient submission:", err);
      setToastMessage({
        message: err instanceof Error ? err.message : "Failed to add patient",
        type: "error",
      });
    }
  };

  const handleEditClick = async (patient: Patient) => {
    try {
      // Fetch complete patient data
      setLoading(true);
      const fullPatientData = await patientApi.getPatientById(patient.id);

      // Set the complete patient info for the form
      setSelectedPatient({
        ...patient,
        // Convert to the format expected by EditPatientForm
        client_id: patient.id,
        first_name: patient.name.split(" ")[0],
        last_name: patient.name.split(" ").slice(1).join(" "),
        birthdate: fullPatientData.patient_info.birthdate,
        first_visit_date: patient.lastVisit,
        race: patient.race,
        // Add any other fields from fullPatientData.patient_info that EditPatientForm expects
        ...fullPatientData.patient_info,
        latestGoals: fullPatientData.latest_goals,
      });

      setIsEditFormOpen(true);
    } catch (err) {
      console.error("Error fetching patient details:", err);
      setToastMessage({
        message: "Failed to load patient data for editing",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (data: any) => {
    if (!selectedPatient) return;

    try {
      console.log("Submitting patient update with data:", data);

      // Make sure goals data is formatted correctly if present
      let requestData = { ...data };

      // If there are goals in the data, prepare them for the API
      if (data.goals) {
        // Format is already correct, as EditPatientForm handles this conversion
        console.log("Submitting with goals data:", data.goals);
      }

      // Call the API to update the patient
      await patientApi.updatePatient(selectedPatient.id, requestData);

      // Close the edit form
      setIsEditFormOpen(false);

      // Show success message
      setToastMessage({
        message: "Patient updated successfully",
        type: "success",
      });

      // Force a complete refresh of patient data to see updates
      setLoading(true);

      try {
        // Refresh the patient list
        const updatedData = await patientApi.getPatients(
          pagination.page,
          pagination.limit,
        );

        // Transform and update the patient data
        const transformedPatients = updatedData.patients.map(
          (patient: any) => ({
            id: patient.client_id,
            name: `${patient.first_name} ${patient.last_name}`,
            age: patient.age,
            gender: patient.gender,
            lastVisit: patient.first_visit_date,
            nextAppointment: "",
            contact: patient.phone || "N/A",
          }),
        );

        setPatients(transformedPatients);

        // If this patient is still in view, fetch their updated details
        const updatedPatient = transformedPatients.find(
          (p) => p.id === selectedPatient.id,
        );
        if (updatedPatient) {
          console.log(
            "Refreshing detailed data for patient:",
            updatedPatient.id,
          );

          // Optionally refresh the selected patient data if needed
          // This could be useful if you need to immediately update the UI with new goals
          try {
            const detailedData = await patientApi.getPatientById(
              updatedPatient.id,
            );
            console.log("Received updated patient data:", detailedData);

            // Update the selected patient with the latest data
            setSelectedPatient({
              ...updatedPatient,
              client_id: updatedPatient.id,
              ...detailedData.patient_info,
              latestGoals: detailedData.latest_goals,
            });
          } catch (detailError) {
            console.error(
              "Error fetching updated patient details:",
              detailError,
            );
          }
        }
      } catch (fetchErr) {
        console.error("Error refreshing patient data after update:", fetchErr);
      } finally {
        setLoading(false);
      }
    } catch (err) {
      console.error("Error updating patient:", err);
      setToastMessage({
        message:
          err instanceof Error ? err.message : "Failed to update patient",
        type: "error",
      });
    }
  };

  const handleDelete = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPatient) return;

    try {
      // Delete the patient
      await patientApi.deletePatient(selectedPatient.id);

      // Close the confirmation modal
      setIsDeleteModalOpen(false);

      // Show success message
      setToastMessage({
        message: "Patient deleted successfully",
        type: "success",
      });

      // Force a data refetch by setting loading to true
      setLoading(true);

      try {
        const currentPage = pagination.page;
        const itemsOnCurrentPage = filteredAndSortedPatients.length;
        const newPage =
          itemsOnCurrentPage === 1 && currentPage > 1
            ? currentPage - 1
            : currentPage;

        // Fetch the updated patient list
        const data = await patientApi.getPatients(newPage, pagination.limit);

        // Update the patient data and pagination
        const transformedPatients = data.patients.map((patient: any) => ({
          id: patient.client_id,
          name: `${patient.first_name} ${patient.last_name}`,
          age: patient.age,
          gender: patient.gender,
          lastVisit: patient.first_visit_date,
          nextAppointment: "",
          contact: patient.phone || "N/A",
        }));

        setPatients(transformedPatients);
        setPagination({
          ...data.pagination,
          page: newPage,
        });
      } catch (fetchErr) {
        console.error("Error fetching updated patient list:", fetchErr);
        // Still show success message for the delete operation
      } finally {
        setLoading(false);
      }
    } catch (err) {
      console.error("Error deleting patient:", err);
      setToastMessage({
        message:
          err instanceof Error ? err.message : "Failed to delete patient",
        type: "error",
      });
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
          Patient Records
        </h1>
        <button
          onClick={() => setIsNewPatientFormOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <PlusIcon size={16} className="mr-1" /> Add New Patient
        </button>
      </div>
      <NewPatientForm
        isOpen={isNewPatientFormOpen}
        onClose={() => setIsNewPatientFormOpen(false)}
        onSubmit={handleNewPatientSubmit}
      />
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search patients by name, gender, contact..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <SearchIcon
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md flex items-center text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              <FilterIcon size={16} className="mr-1" /> Filter
            </button>
            <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700">
              <option>All Patients</option>
              <option>Recent Patients</option>
              <option>Upcoming Appointments</option>
            </select>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded m-4">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900">
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center">
                      Patient Name
                      {sortField === "name" &&
                        (sortDirection === "asc" ? (
                          <ChevronUpIcon size={16} className="ml-1" />
                        ) : (
                          <ChevronDownIcon size={16} className="ml-1" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("age")}
                  >
                    <div className="flex items-center">
                      Age
                      {sortField === "age" &&
                        (sortDirection === "asc" ? (
                          <ChevronUpIcon size={16} className="ml-1" />
                        ) : (
                          <ChevronDownIcon size={16} className="ml-1" />
                        ))}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Gender
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("lastVisit")}
                  >
                    <div className="flex items-center">
                      Last Visit
                      {sortField === "lastVisit" &&
                        (sortDirection === "asc" ? (
                          <ChevronUpIcon size={16} className="ml-1" />
                        ) : (
                          <ChevronDownIcon size={16} className="ml-1" />
                        ))}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("id")}
                  >
                    <div className="flex items-center">
                      Client ID
                      {sortField === "id" &&
                        (sortDirection === "asc" ? (
                          <ChevronUpIcon size={16} className="ml-1" />
                        ) : (
                          <ChevronDownIcon size={16} className="ml-1" />
                        ))}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/patients/${patient.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-medium"
                      >
                        {patient.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {patient.age}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {patient.gender}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(patient.lastVisit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {patient.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {patient.contact}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/patients/${patient.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 px-2 py-1"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleEditClick(patient)}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 px-2 py-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(patient)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 px-2 py-1"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filteredAndSortedPatients.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No patients found matching your search criteria.
            </p>
          </div>
        )}

        {!loading && !error && filteredAndSortedPatients.length > 0 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing{" "}
              <span className="font-medium">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of <span className="font-medium">{pagination.total}</span> results
            </div>
            <div className="flex space-x-2">
              <button
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                disabled={pagination.page <= 1 || loading}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
              >
                Previous
              </button>
              <button
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                disabled={pagination.page >= pagination.pages || loading}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedPatient && (
        <EditPatientForm
          isOpen={isEditFormOpen}
          onClose={() => setIsEditFormOpen(false)}
          onSubmit={handleEditSubmit}
          patient={selectedPatient}
          latestGoals={selectedPatient.latestGoals}
        />
      )}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemType="patient"
      />
      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
};

export default PatientRecords;
