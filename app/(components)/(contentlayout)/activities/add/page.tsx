"use client"
import React, { useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import { Base_url } from '@/app/api/config/BaseUrl';

interface Activity {
  id: string;
  name: string;
  sortOrder: number;
  frequency?: string;
  frequencyConfig?: any;
  createdAt: string;
  updatedAt: string;
}

const AddActivityPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Frequency configuration modal state
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    sortOrder: 1,
    frequency: '',
    frequencyConfig: {
      hourlyInterval: 1,
      dailyTime: '',
      weeklyDays: [] as string[],
      weeklyTime: '',
      monthlyDay: 1,
      monthlyTime: '',
      quarterlyMonths: [] as string[],
      quarterlyDay: 1,
      quarterlyTime: '',
      yearlyMonth: '',
      yearlyDate: 1,
      yearlyTime: ''
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'sortOrder' ? parseInt(value) || 1 : value
    }));
  };

  // Frequency configuration functions
  const handleFrequencyConfigChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      frequencyConfig: {
        ...prev.frequencyConfig,
        [field]: value
      }
    }));
  };

  const validateFrequencyConfig = () => {
    const { frequency, frequencyConfig } = formData;
    
    switch (frequency) {
      case 'Hourly':
        return frequencyConfig.hourlyInterval > 0;
      case 'Daily':
        return frequencyConfig.dailyTime !== '';
      case 'Weekly':
        return frequencyConfig.weeklyDays.length > 0 && frequencyConfig.weeklyTime !== '';
      case 'Monthly':
        return frequencyConfig.monthlyDay > 0 && frequencyConfig.monthlyDay <= 31 && frequencyConfig.monthlyTime !== '';
      case 'Quarterly':
        return frequencyConfig.quarterlyMonths.length > 0 && frequencyConfig.quarterlyDay > 0 && frequencyConfig.quarterlyDay <= 31 && frequencyConfig.quarterlyTime !== '';
      case 'Yearly':
        return frequencyConfig.yearlyMonth !== '' && frequencyConfig.yearlyDate > 0 && frequencyConfig.yearlyDate <= 31 && frequencyConfig.yearlyTime !== '';
      default:
        return false;
    }
  };

  const formatTimeForAPI = (timeString: string) => {
    if (!timeString) return '';
    
    // Convert 24-hour format to 12-hour format with AM/PM
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const handleSaveFrequencyConfig = () => {
    if (validateFrequencyConfig()) {
      setShowFrequencyModal(false);
      toast.success('Frequency configuration saved');
    } else {
      toast.error('Please fill in all required fields for the selected frequency');
    }
  };

  const handleCancelFrequencyConfig = () => {
    setShowFrequencyModal(false);
  };

  const getFrequencyConfigStatus = () => {
    if (!formData.frequency) return 'Not configured';
    return validateFrequencyConfig() ? 'Configured' : 'Incomplete';
  };

  const getFrequencyConfigStatusColor = () => {
    if (!formData.frequency) return 'text-gray-500';
    return validateFrequencyConfig() ? 'text-green-600' : 'text-red-600';
  };

  // Helper function to include selected frequency config
  const includeSelectedFrequency = (frequency: string, frequencyConfig: any) => {
    const frequencyConfigObject: any = {};
    switch (frequency) {
      case 'Hourly':
        frequencyConfigObject['hourlyInterval'] = frequencyConfig.hourlyInterval;
        break;
      case 'Daily':
        frequencyConfigObject['dailyTime'] = frequencyConfig.dailyTime;
        break;
      case 'Weekly':
        frequencyConfigObject['weeklyDays'] = frequencyConfig.weeklyDays;
        frequencyConfigObject['weeklyTime'] = frequencyConfig.weeklyTime;
        break;
      case 'Monthly':
        frequencyConfigObject['monthlyDay'] = frequencyConfig.monthlyDay;
        frequencyConfigObject['monthlyTime'] = frequencyConfig.monthlyTime;
        break;
      case 'Quarterly':
        frequencyConfigObject['quarterlyMonths'] = frequencyConfig.quarterlyMonths;
        frequencyConfigObject['quarterlyDay'] = frequencyConfig.quarterlyDay;
        frequencyConfigObject['quarterlyTime'] = frequencyConfig.quarterlyTime;
        break;
      case 'Yearly':
        frequencyConfigObject['yearlyMonth'] = frequencyConfig.yearlyMonth;
        frequencyConfigObject['yearlyDate'] = frequencyConfig.yearlyDate;
        frequencyConfigObject['yearlyTime'] = frequencyConfig.yearlyTime;
        break;
    }
    return frequencyConfigObject;
  };

  // Helper function to remove empty fields from request body
  const removeEmptyFields = (obj: any) => {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            cleaned[key] = value;
          }
        } else if (typeof value === 'object') {
          const cleanedObj = removeEmptyFields(value);
          if (Object.keys(cleanedObj).length > 0) {
            cleaned[key] = cleanedObj;
          }
        } else {
          cleaned[key] = value;
        }
      }
    });
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate frequency configuration if frequency is selected
    if (formData.frequency && !validateFrequencyConfig()) {
      toast.error('Please configure the frequency settings properly');
      return;
    }
    
    try {
      setIsLoading(true);

      // Format frequency configuration for API
      const formattedFrequencyConfig = {
        ...formData.frequencyConfig,
        dailyTime: formatTimeForAPI(formData.frequencyConfig.dailyTime),
        weeklyTime: formatTimeForAPI(formData.frequencyConfig.weeklyTime),
        monthlyTime: formatTimeForAPI(formData.frequencyConfig.monthlyTime),
        quarterlyTime: formatTimeForAPI(formData.frequencyConfig.quarterlyTime),
        yearlyTime: formatTimeForAPI(formData.frequencyConfig.yearlyTime)
      };

      const cleanedFrequencyConfig = formData.frequency ? includeSelectedFrequency(formData.frequency, formattedFrequencyConfig) : {};

      // Remove empty fields from request body
      const cleanedFormData = removeEmptyFields({
        name: formData.name,
        sortOrder: formData.sortOrder,
        frequency: formData.frequency || undefined,
        frequencyConfig: Object.keys(cleanedFrequencyConfig).length > 0 ? cleanedFrequencyConfig : undefined
      });

      const response = await fetch(`${Base_url}activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(cleanedFormData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create activity');
      }

      const data: Activity = await response.json();
      toast.success('Activity created successfully');
      router.push('/activities');
    } catch (err) {
      console.error('Error creating activity:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create activity');
    } finally {
      setIsLoading(false);
    }
  };

  const getFrequencyOptions = () => {
    const options = [
      { value: 'Hourly', label: 'Hourly' },
      { value: 'Daily', label: 'Daily' },
      { value: 'Weekly', label: 'Weekly' },
      { value: 'Monthly', label: 'Monthly' },
      { value: 'Quarterly', label: 'Quarterly' },
      { value: 'Yearly', label: 'Yearly' }
    ];
    return options;
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Add Activity"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add New Activity</h1>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-3">
                  <li className="inline-flex items-center">
                    <Link href="/activities" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary">
                      <i className="ri-home-line mr-2"></i>
                      Activities
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <i className="ri-arrow-right-s-line text-gray-400 mx-2"></i>
                      <span className="text-sm font-medium text-gray-500">Add New Activity</span>
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
                  {/* Activity Name */}
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">Activity Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="form-control"
                      placeholder="Enter activity name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  {/* Sort Order */}
                  <div className="form-group">
                    <label htmlFor="sortOrder" className="form-label">Sort Order <span className="text-red-500">*</span></label>
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



                  {/* Frequency */}
                  <div className="form-group">
                    <label htmlFor="frequency" className="form-label">Frequency</label>
                    <select
                      id="frequency"
                      name="frequency"
                      className="form-select"
                      value={formData.frequency}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Frequency (Optional)</option>
                      {getFrequencyOptions().map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Frequency Configuration */}
                  {formData.frequency && (
                    <div className="form-group col-span-1 md:col-span-2">
                      <label className="form-label">Frequency Configuration</label>
                      <button
                        type="button"
                        className={`w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary hover:bg-gray-50`}
                        onClick={() => setShowFrequencyModal(true)}
                      >
                        <span className={`${getFrequencyConfigStatusColor()}`}>
                          {getFrequencyConfigStatus()}
                        </span>
                        <i className="ri-settings-3-line text-gray-400"></i>
                      </button>
                    </div>
                  )}

                  {/* Form Actions */}
                  <div className="flex items-center space-x-3 col-span-1 md:col-span-2">
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        'Save Activity'
                      )}
                    </button>
                    <button
                      type="button"
                      className="ti-btn ti-btn-secondary"
                      onClick={() => router.push('/activities')}
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

      {/* Frequency Configuration Modal */}
      {showFrequencyModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50"></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-xl font-semibold">
                  Configure {formData.frequency} Frequency
                </h3>
                <button
                  onClick={handleCancelFrequencyConfig}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>

              <div className="p-6">
                {formData.frequency === 'Hourly' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Hourly Interval <span className="text-red-500">*</span></label>
                      <select
                        className="form-select"
                        value={formData.frequencyConfig.hourlyInterval}
                        onChange={(e) => handleFrequencyConfigChange('hourlyInterval', parseInt(e.target.value) || 1)}
                      >
                        {Array.from({ length: 24 }, (_, i) => i + 1).map(hour => (
                          <option key={hour} value={hour}>
                            Every {hour} hour{hour > 1 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                      <small className="text-gray-500">How many hours between each occurrence</small>
                    </div>
                  </div>
                )}

                {formData.frequency === 'Daily' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Daily Time <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        className="form-control"
                        value={formData.frequencyConfig.dailyTime}
                        onChange={(e) => handleFrequencyConfigChange('dailyTime', e.target.value)}
                      />
                      <small className="text-gray-500">Time of day for the activity</small>
                    </div>
                  </div>
                )}

                {formData.frequency === 'Weekly' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Days of Week <span className="text-red-500">*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                          <label key={day} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="form-checkbox"
                              checked={formData.frequencyConfig.weeklyDays.includes(day)}
                              onChange={(e) => {
                                const currentDays = formData.frequencyConfig.weeklyDays;
                                if (e.target.checked) {
                                  handleFrequencyConfigChange('weeklyDays', [...currentDays, day]);
                                } else {
                                  handleFrequencyConfigChange('weeklyDays', currentDays.filter(d => d !== day));
                                }
                              }}
                            />
                            <span className="text-sm">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Weekly Time <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        className="form-control"
                        value={formData.frequencyConfig.weeklyTime}
                        onChange={(e) => handleFrequencyConfigChange('weeklyTime', e.target.value)}
                      />
                      <small className="text-gray-500">Time of day for the activity</small>
                    </div>
                  </div>
                )}

                {formData.frequency === 'Monthly' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Day of Month <span className="text-red-500">*</span></label>
                      <select
                        className="form-select"
                        value={formData.frequencyConfig.monthlyDay}
                        onChange={(e) => handleFrequencyConfigChange('monthlyDay', parseInt(e.target.value) || 1)}
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                      <small className="text-gray-500">Day of the month for the activity</small>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Monthly Time <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        className="form-control"
                        value={formData.frequencyConfig.monthlyTime}
                        onChange={(e) => handleFrequencyConfigChange('monthlyTime', e.target.value)}
                      />
                      <small className="text-gray-500">Time of day for the activity</small>
                    </div>
                  </div>
                )}

                {formData.frequency === 'Quarterly' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Quarterly Months <span className="text-red-500">*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        {['January', 'April', 'July', 'October'].map(month => (
                          <label key={month} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="form-checkbox"
                              checked={formData.frequencyConfig.quarterlyMonths.includes(month)}
                              onChange={(e) => {
                                const currentMonths = formData.frequencyConfig.quarterlyMonths;
                                if (e.target.checked) {
                                  handleFrequencyConfigChange('quarterlyMonths', [...currentMonths, month]);
                                } else {
                                  handleFrequencyConfigChange('quarterlyMonths', currentMonths.filter((m: string) => m !== month));
                                }
                              }}
                            />
                            <span className="text-sm">{month}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Day of Month <span className="text-red-500">*</span></label>
                      <select
                        className="form-select"
                        value={formData.frequencyConfig.quarterlyDay}
                        onChange={(e) => handleFrequencyConfigChange('quarterlyDay', parseInt(e.target.value) || 1)}
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                      <small className="text-gray-500">Day of the month for the activity</small>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Quarterly Time <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        className="form-control"
                        value={formData.frequencyConfig.quarterlyTime}
                        onChange={(e) => handleFrequencyConfigChange('quarterlyTime', e.target.value)}
                      />
                      <small className="text-gray-500">Time of day for the activity</small>
                    </div>
                  </div>
                )}

                {formData.frequency === 'Yearly' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Month <span className="text-red-500">*</span></label>
                      <select
                        className="form-select"
                        value={formData.frequencyConfig.yearlyMonth}
                        onChange={(e) => handleFrequencyConfigChange('yearlyMonth', e.target.value)}
                      >
                        <option value="">Select Month</option>
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
                          <option key={month} value={month}>
                            {month}
                          </option>
                        ))}
                      </select>
                      <small className="text-gray-500">Month of the year for the activity</small>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Day of Month <span className="text-red-500">*</span></label>
                      <select
                        className="form-select"
                        value={formData.frequencyConfig.yearlyDate}
                        onChange={(e) => handleFrequencyConfigChange('yearlyDate', parseInt(e.target.value) || 1)}
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                      <small className="text-gray-500">Day of the month for the activity</small>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Yearly Time <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        className="form-control"
                        value={formData.frequencyConfig.yearlyTime}
                        onChange={(e) => handleFrequencyConfigChange('yearlyTime', e.target.value)}
                      />
                      <small className="text-gray-500">Time of day for the activity</small>
                    </div>
                  </div>
                )}

                {/* Modal Actions */}
                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                  <button
                    type="button"
                    className="ti-btn ti-btn-secondary"
                    onClick={handleCancelFrequencyConfig}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary"
                    onClick={handleSaveFrequencyConfig}
                  >
                    Save Configuration
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddActivityPage; 