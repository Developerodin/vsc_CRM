"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";

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

interface Group {
  id: string;
  name: string;
  numberOfClients: number;
  clients: Client[];
  createdDate: string;
  sortOrder: number;
}

const AddClientPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
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

  const [formData, setFormData] = useState({
    name: "",
    groupClients: [],
    sortOrder: "1",
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // try {
    //   setIsLoading(true);

    //   // First, if there's an image, upload it
    //   let imageUrl = null;
    //   if (selectedImage) {
    //     const formData = new FormData();
    //     formData.append('image', selectedImage);

    //     const imageResponse = await fetch(`${API_BASE_URL}/upload`, {
    //       method: 'POST',
    //       body: formData,
    //     });

    //     if (!imageResponse.ok) {
    //       throw new Error('Failed to upload image');
    //     }

    //     const imageData = await imageResponse.json();
    //     imageUrl = imageData.url; // Assuming the API returns the image URL
    //   }

    //   // Prepare client data
    //   const clientData = {
    //     name: formData.name,
    //     parent: formData.parent || undefined,
    //     description: formData.description || undefined,
    //     sortOrder: parseInt(formData.sortOrder),
    //     status: formData.status,
    //     image: imageUrl || undefined
    //   };

    //   // Create client
    //   const response = await fetch(`${API_BASE_URL}/groups`, {
    //     method: 'POST',
    //     headers: {
    //       'Accept': 'application/json',
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(clientData),
    //   });

    //   if (!response.ok) {
    //     const errorData = await response.json();
    //     throw new Error(errorData.message || 'Failed to create client');
    //   }

    //   toast.success('Client created successfully');
    //   router.push('/clients');
    // } catch (err) {
    //   console.error('Error creating client:', err);
    //   toast.error(err instanceof Error ? err.message : 'Failed to create client');
    // } finally {
    //   setIsLoading(false);
    // }
    router.push("/dashboards/crm");
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Add Client" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">
                Add New Client
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
                        Add New Client
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
                  {/* Client Name */}
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">
                      Group Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="form-control"
                      placeholder="Enter client name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Sort Order */}
                  <div className="form-group">
                    <label htmlFor="sortOrder" className="form-label">
                      Sort Order *
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
                    <label htmlFor="group-clients" className="form-label">Group Clients *</label>
                    <select
                      id="group-clients"
                      name="groupClients"
                      className="form-select"
                      value={formData.groupClients}
                      onChange={handleInputChange}
                      multiple
                    >
                      <option value="">Select Group Clients</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.id}. {client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center space-x-3 col-span-1 md:col-span-2">
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? "Saving..." : "Save Client"}
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-secondary"
                      onClick={() => router.push("/groups")}
                      disabled={isLoading}
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
    </div>
  );
};

export default AddClientPage;
