"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import { Base_url } from "@/app/api/config/BaseUrl";
import { useBranchContext } from "@/shared/contextapi";

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  email2: string;
  address: string;
  district: string;
  state: string;
  country: string;
  fNo: string;
  pan: string;
  dob: string;
  branchId: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface Group {
  id: string;
  name: string;
  numberOfClients: number;
  clients: Client[];
  branch: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const EditGroupPage = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  const { branches } = useBranchContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedClients, setSelectedClients] = useState<Client[]>([]);
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  const [formData, setFormData] = useState({
    name: "",
    branch: "",
    sortOrder: 1,
  });

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const response = await fetch(`${Base_url}groups/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch group');
        }

        const data = await response.json();
        setFormData({
          name: data.name,
          branch: data.branch,
          sortOrder: data.sortOrder,
        });
        setSelectedClients(data.clients);
      } catch (err) {
        console.error('Error fetching group:', err);
        toast.error('Failed to fetch group details');
        router.push('/groups');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroup();
  }, [params.id, router]);

  const fetchAvailableClients = async (page: number = 1) => {
    try {
      setIsLoadingClients(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        sort: `${sortField}:${sortOrder}`,
        ...(searchQuery && { search: searchQuery })
      });

      const response = await fetch(`${Base_url}clients?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }

      const data = await response.json();
      setAvailableClients(data.results);
      const totalResults = data.totalResults || data.total || 0;
      const limit = 10;
      setTotalPages(Math.max(1, Math.ceil(totalResults / limit)));
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching clients:', err);
      toast.error('Failed to fetch clients');
    } finally {
      setIsLoadingClients(false);
    }
  };

  useEffect(() => {
    if (showModal) {
      fetchAvailableClients(currentPage);
    }
  }, [showModal, sortField, sortOrder, searchQuery, currentPage]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'sortOrder' ? parseInt(value) || 1 : value,
    }));
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClients(prev => {
      const isSelected = prev.some(c => c.id === client.id);
      if (isSelected) {
        return prev.filter(c => c.id !== client.id);
      } else {
        return [...prev, client];
      }
    });
  };

  const handleModalSubmit = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!formData.name.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (!formData.branch) {
      toast.error('Please select a branch');
      return;
    }

    try {
      setIsSaving(true);

      const groupData = {
        name: formData.name,
        numberOfClients: selectedClients.length,
        clients: selectedClients.map(client => client.id),
        branch: formData.branch,
        sortOrder: formData.sortOrder
      };

      const response = await fetch(`${Base_url}groups/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(groupData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update group');
      }

      toast.success('Group updated successfully');
      router.push('/groups');
    } catch (err) {
      console.error('Error updating group:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update group');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchAvailableClients(newPage);
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Edit Group" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">
                Edit Group
              </h1>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <Link
                      href="/groups"
                      className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary"
                    >
                      <i className="ri-home-line mr-2"></i>
                      Groups
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                      <span className="text-sm font-medium text-gray-500">
                        Edit Group
                      </span>
                    </div>
                  </li>
                </ol>
              </nav>
            </div>
          </div>

          {/* Form Box */}
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Group Name */}
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">
                      Group Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="form-control"
                      placeholder="Enter group name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Branch */}
                  <div className="form-group">
                    <label htmlFor="branch" className="form-label">
                      Branch <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="branch"
                      name="branch"
                      className="form-select"
                      value={formData.branch}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select a branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div className="form-group">
                    <label htmlFor="sortOrder" className="form-label">
                      Sort Order <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="sortOrder"
                      name="sortOrder"
                      className="form-control"
                      placeholder="Enter sort order"
                      value={formData.sortOrder}
                      onChange={handleInputChange}
                      required
                      min="1"
                    />
                  </div>

                  {/* Group Clients */}
                  <div className="form-group col-span-1 md:col-span-2">
                    <label className="form-label">
                      Group Clients
                    </label>
                    <div className="flex items-center space-x-4">
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary"
                        onClick={() => setShowModal(true)}
                      >
                        Select Clients ({selectedClients.length} selected)
                      </button>
                      {selectedClients.length > 0 && (
                        <span className="text-sm text-gray-500">
                          {selectedClients.length} clients selected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center space-x-3 col-span-1 md:col-span-2">
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-secondary"
                      onClick={() => router.push("/groups")}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Client Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-11/12 max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Select Clients</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <div className="p-4 border-b">
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="Search clients..."
                  className="form-control flex-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  className="form-select w-48"
                  value={`${sortField}:${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split(':');
                    setSortField(field);
                    setSortOrder(order);
                  }}
                >
                  <option value="name:asc">Name (A-Z)</option>
                  <option value="name:desc">Name (Z-A)</option>
                  <option value="email:asc">Email (A-Z)</option>
                  <option value="email:desc">Email (Z-A)</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {isLoadingClients ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Select
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          F.No
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PAN
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {availableClients.map((client) => (
                        <tr key={client.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="form-checkbox h-5 w-5 text-primary"
                              checked={selectedClients.some(c => c.id === client.id)}
                              onChange={() => handleClientSelect(client)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {client.fNo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {client.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {client.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {client.pan}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {client.phone}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1}
                  className="ti-btn ti-btn-secondary"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  {totalPages > 0 ? (
                    `Page ${currentPage} of ${totalPages}`
                  ) : (
                    "No pages"
                  )}
                </span>
                <button
                  onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="ti-btn ti-btn-secondary"
                >
                  Next
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="ti-btn ti-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModalSubmit}
                  className="ti-btn ti-btn-primary"
                >
                  Select ({selectedClients.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditGroupPage; 