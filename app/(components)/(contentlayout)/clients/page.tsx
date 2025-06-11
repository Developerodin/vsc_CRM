"use client";
import React, { useState, useEffect, useRef } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";

interface Client {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
  group: string;
  createdDate: string;
  sortOrder: number;
}

interface ExcelRow {
  ID?: string;
  "Client Name": string;
  "Client Phone Number": string;
  "Client Email": string;
  "Client Address": string;
  "Client Group": string;
  "Created Date": string;
  "Sort Order"?: string | number;
}

const ClientsPage = () => {
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [clients, setClients] = useState<Client[]>([
    {
      id: "1",
      name: "Aarav Sharma",
      phoneNumber: "+91-9876543210",
      email: "aarav.sharma@example.com",
      address: "123 Park Street, Bengaluru, Karnataka",
      group: "Premium Group",
      createdDate: "01 June 2025",
      sortOrder: 1,
    },
    {
      id: "2",
      name: "Priya Verma",
      phoneNumber: "+91-9123456789",
      email: "priya.verma@example.com",
      address: "456 MG Road, Pune, Maharashtra",
      group: "Premium Group",
      createdDate: "02 June 2025",
      sortOrder: 2,
    },
    {
      id: "3",
      name: "Rohan Patel",
      phoneNumber: "+91-9988776655",
      email: "rohan.patel@example.com",
      address: "789 Residency Road, Ahmedabad, Gujarat",
      group: "Premium Group",
      createdDate: "03 June 2025",
      sortOrder: 3,
    },
    {
      id: "4",
      name: "Sneha Iyer",
      phoneNumber: "+91-9012345678",
      email: "sneha.iyer@example.com",
      address: "101 Lake View, Chennai, Tamil Nadu",
      group: "Premium Group",
      createdDate: "04 June 2025",
      sortOrder: 4,
    },
    {
      id: "5",
      name: "Arjun Reddy",
      phoneNumber: "+91-9123456781",
      email: "arjun.reddy@example.com",
      address: "202 Central Mall, Hyderabad, Telangana",
      group: "Bharat Group",
      createdDate: "05 June 2025",
      sortOrder: 5,
    },
    {
      id: "6",
      name: "Meera Nambiar",
      phoneNumber: "+91-9876543211",
      email: "meera.nambiar@example.com",
      address: "303 Skyline Towers, Kochi, Kerala",
      group: "Bharat Group",
      createdDate: "06 June 2025",
      sortOrder: 6,
    },
    {
      id: "7",
      name: "Vikram Joshi",
      phoneNumber: "+91-9345678901",
      email: "vikram.joshi@example.com",
      address: "404 Hill View, Indore, Madhya Pradesh",
      group: "Bharat Group",
      createdDate: "07 June 2025",
      sortOrder: 7,
    },
    {
      id: "8",
      name: "Anjali Das",
      phoneNumber: "+91-9567890123",
      email: "anjali.das@example.com",
      address: "505 Tech Park, Bhubaneswar, Odisha",
      group: "Ganesh Group",
      createdDate: "08 June 2025",
      sortOrder: 8,
    },
    {
      id: "9",
      name: "Karan Thakur",
      phoneNumber: "+91-9234567890",
      email: "karan.thakur@example.com",
      address: "606 Green Valley, Shimla, Himachal Pradesh",
      group: "Ganesh Group",
      createdDate: "09 June 2025",
      sortOrder: 9,
    },
    {
      id: "10",
      name: "Neha Kapoor",
      phoneNumber: "+91-9988007766",
      email: "neha.kapoor@example.com",
      address: "707 Harmony Lane, Jaipur, Rajasthan",
      group: "Ganesh Group",
      createdDate: "10 June 2025",
      sortOrder: 10,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false); // Initially set to true when API integrated
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(10); // Initially set to 0 when API integrated
  const [totalPages, setTotalPages] = useState(1);
  const [importProgress, setImportProgress] = useState<number | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredClients.map((client) => client.id));
    }
    setSelectAll(!selectAll);
  };

  const handleClientSelect = (clientId: string) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter((id) => id !== clientId));
    } else {
      setSelectedClients([...selectedClients, clientId]);
    }
  };

  // Filter clients based on search query
  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate current clients for the current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClients = filteredClients.slice(startIndex, endIndex);

  const handleExport = async () => {
    try {
      // Always fetch all categories for export
      // const response = await fetch(`${API_BASE_URL}/categories?page=1&limit=100000`);
      // if (!response.ok) throw new Error('Failed to fetch all categories for export');
      // const data = await response.json();
      const exportSource = Array.isArray(clients) ? clients : [];
      const exportData = exportSource.map((client: Client) => ({
        ID: client.id,
        "Client Name": client.name,
        "Client Phone Number": client.phoneNumber,
        "Client Email": client.email,
        "Client Address": client.address,
        "Client Group": client.group,
        "Created Date": client.createdDate,
        "Sort Order": client.sortOrder,
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 20 },
        { wch: 20 },
        { wch: 30 },
        { wch: 20 },
        { wch: 10 },
        { wch: 10 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Clients");
      const fileName = `clients_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Clients exported successfully");
    } catch (error) {
      console.error("Error exporting clients:", error);
      toast.error("Failed to export clients");
    }
  };

  // Condensed pagination helper
  function getPagination(currentPage: number, totalPages: number) {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 4) pages.push("...");
      for (
        let i = Math.max(2, currentPage - 2);
        i <= Math.min(totalPages - 1, currentPage + 2);
        i++
      ) {
        pages.push(i);
      }
      if (currentPage < totalPages - 3) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Clients" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Clients</h1>
              <div className="box-tools flex items-center space-x-2">
                {selectedClients.length > 0 && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger"
                    // onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line me-2"></i>
                    Delete Selected ({selectedClients.length})
                  </button>
                )}
                {/* Import/Export Buttons */}
                <div className="relative group">
                  <input
                    type="file"
                    // ref={fileInputRef}
                    className="hidden"
                    accept=".xlsx,.xls"
                    // onChange={handleImport}
                  />
                  <button
                    type="button"
                    className="ti-btn ti-btn-success"
                    // onClick={() => fileInputRef.current?.click()}
                  >
                    <i className="ri-upload-2-line me-2"></i> Import
                  </button>
                </div>
                {importProgress !== null && (
                  <div className="w-40 h-3 bg-gray-200 rounded-full overflow-hidden flex items-center ml-2">
                    <div
                      className="bg-primary h-full transition-all duration-200"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                    <span className="ml-2 text-xs text-gray-700">
                      {importProgress}%
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  className="ti-btn ti-btn-primary"
                  onClick={handleExport}
                >
                  <i className="ri-download-2-line me-2"></i> Export
                </button>
                <Link href="/clients/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i> Add New Client
                </Link>
              </div>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              {/* Search Bar */}
              <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                <div className="flex items-center">
                  <label className="mr-2 text-sm text-gray-600">
                    Rows per page:
                  </label>
                  <select
                    className="form-select w-auto text-sm"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                  </select>
                </div>
                <div className="relative w-full max-w-xs">
                  <input
                    type="text"
                    className="form-control py-3 pr-10"
                    placeholder="Search by client name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="absolute end-0 top-0 px-4 h-full">
                    <i className="ri-search-line text-lg"></i>
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">
                  <i className="ri-error-warning-line text-3xl mb-2"></i>
                  <p>{error}</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table whitespace-nowrap table-bordered min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th scope="col" className="!text-start">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectAll}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th scope="col" className="text-start">
                          Client Name
                        </th>
                        <th scope="col" className="text-start">
                          Client Phone Number
                        </th>
                        <th scope="col" className="text-start">
                          Client Email
                        </th>
                        <th scope="col" className="text-start">
                          Client Address
                        </th>
                        <th scope="col" className="text-start">
                          Client Group
                        </th>
                        <th scope="col" className="text-start">
                          Created Date
                        </th>
                        <th scope="col" className="text-start">
                          Sort Order
                        </th>
                        <th scope="col" className="text-start">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentClients.length > 0 ? (
                        currentClients.map((client: Client, index: number) => (
                          <tr
                            key={client.id}
                            className={`border-b border-gray-200 ${
                              index % 2 === 0 ? "bg-gray-50" : ""
                            }`}
                          >
                            <td>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedClients.includes(client.id)}
                                onChange={() => handleClientSelect(client.id)}
                              />
                            </td>
                            <td>{client.name}</td>
                            <td>{client.phoneNumber}</td>
                            <td>{client.email}</td>
                            <td>{client.address}</td>
                            <td>{client.group}</td>
                            <td>{client.createdDate}</td>
                            <td>{client.sortOrder}</td>
                            <td>
                              <div className="flex space-x-2">
                                {/* <Link
                                  href={`/catalog/clients/edit/${client.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                > */}
                                {/* Wrapper div temporarily used for styling */}
                                <div className="ti-btn ti-btn-primary ti-btn-sm">
                                  <i className="ri-edit-line"></i>
                                </div>
                                {/* </Link> */}
                                <button
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  // onClick={() => handleDelete(client.id)}
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                                <i className="ri-folder-line text-4xl text-primary"></i>
                              </div>
                              <h3 className="text-xl font-medium mb-2">
                                No Clients Found
                              </h3>
                              <p className="text-gray-500 text-center mb-6">
                                Start by adding your first client.
                              </p>
                              <Link
                                href="/clients/add"
                                className="ti-btn ti-btn-primary"
                              >
                                <i className="ri-add-line me-2"></i> Add First
                                Client
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {!isLoading && !error && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-500">
                    Showing{" "}
                    {totalResults === 0
                      ? 0
                      : (currentPage - 1) * itemsPerPage + 1}{" "}
                    to{" "}
                    {totalResults === 0
                      ? 0
                      : Math.min(currentPage * itemsPerPage, totalResults)}{" "}
                    of {totalResults} entries
                  </div>
                  <nav aria-label="Page navigation" className="">
                    <ul className="flex flex-wrap items-center">
                      <li
                        className={`page-item ${
                          currentPage === 1 ? "disabled" : ""
                        }`}
                      >
                        <button
                          className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={currentPage === 1}
                        >
                          Previous
                        </button>
                      </li>
                      {getPagination(currentPage, totalPages).map((page, idx) =>
                        page === "..." ? (
                          <li key={"ellipsis-" + idx} className="page-item">
                            <span className="px-3">...</span>
                          </li>
                        ) : (
                          <li key={page} className="page-item">
                            <button
                              className={`page-link py-2 px-3 leading-tight border border-gray-300 ${
                                currentPage === page
                                  ? "bg-primary text-white hover:bg-primary-dark"
                                  : "bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                              }`}
                              onClick={() => setCurrentPage(Number(page))}
                            >
                              {page}
                            </button>
                          </li>
                        )
                      )}
                      <li
                        className={`page-item ${
                          currentPage === totalPages ? "disabled" : ""
                        }`}
                      >
                        <button
                          className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(prev + 1, totalPages)
                            )
                          }
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientsPage;
