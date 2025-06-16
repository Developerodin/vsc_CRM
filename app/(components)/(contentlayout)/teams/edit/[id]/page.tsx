"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import { API_BASE_URL } from "@/shared/data/utilities/api";
import axios from "axios";

interface TeamMemberData {
  name: string;
  phone: string;
  email: string;
  address: string;
  branch: string;
  sortOrder: number;
}

export default function EditTeamPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<TeamMemberData>({
    name: "",
    phone: "",
    email: "",
    address: "",
    branch: "",
    sortOrder: 1,
  });

  useEffect(() => {
    const fetchTeamMember = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/team-members/${params.id}`
        );
        setFormData({
          name: response.data.name,
          phone: response.data.phone,
          email: response.data.email,
          address: response.data.address,
          branch: response.data.branch,
          sortOrder: response.data.sortOrder,
        });
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching team member:", error);
        toast.error("Failed to fetch team member");
        setIsLoading(false);
      }
    };
    fetchTeamMember();
  }, [params.id]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const loadingToast = toast.loading("Updating team member...");

    try {
      // Create the request body as a JSON object
      const requestBody = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        branch: formData.branch,
        sortOrder: parseInt(formData.sortOrder.toString()),
      };

      await axios.patch(
        `${API_BASE_URL}/team-members/${params.id}`,
        requestBody
      );

      toast.success("Team member updated successfully", { id: loadingToast });
      router.push("/teams");
    } catch (error) {
      console.error("Error updating team member:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update team member",
        { id: loadingToast }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Edit Team Member" />

      <div className="box !bg-transparent border-0 shadow-none mb-4">
        <div className="box-header">
          <h1 className="box-title text-2xl font-semibold">Edit Team Member</h1>
        </div>
      </div>

      <div className="box">
        <div className="box-body">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Team Member Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label className="form-label">Team Member Phone</label>
                <input
                  type="text"
                  name="phone"
                  className="form-control"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label className="form-label">Team Member Email</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label className="form-label">Team Member Address</label>
                <input
                  type="text"
                  name="address"
                  className="form-control"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label className="form-label">Team Member Branch</label>
                <input
                  type="text"
                  name="branch"
                  className="form-control"
                  value={formData.branch}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label className="form-label">Sort Order</label>
                <input
                  type="number"
                  name="sortOrder"
                  className="form-control"
                  value={formData.sortOrder}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="ti-btn ti-btn-secondary"
                onClick={() => router.push("/teams")}
              >
                Cancel
              </button>
              <button type="submit" className="ti-btn ti-btn-primary">
                Update Team Member
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
