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
  subactivities?: Array<{ 
    name: string;
    frequency?: string;
    frequencyConfig?: any;
    fields?: Array<{
      name: string;
      type: string;
    }>;
  }>;
  createdAt: string;
  updatedAt: string;
}

const AddActivityPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Frequency configuration modal state
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [selectedSubActivityIndex, setSelectedSubActivityIndex] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    sortOrder: 1,
    subactivities: [] as Array<{
      name: string;
      frequency?: string;
      frequencyConfig?: any;
      fields?: Array<{
        name: string;
        type: string;
      }>;
    }>
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'sortOrder' ? parseInt(value) || 1 : value
    }));
  };

  // Sub-activity functions
  const addSubActivity = () => {
    setFormData(prev => ({
      ...prev,
      subactivities: [...prev.subactivities, { 
        name: '',
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
        },
        fields: []
      }]
    }));
  };

  const removeSubActivity = (index: number) => {
    setFormData(prev => ({
      ...prev,
      subactivities: prev.subactivities.filter((_, i) => i !== index)
    }));
  };

  const updateSubActivity = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      subactivities: prev.subactivities.map((subActivity, i) => 
        i === index ? { ...subActivity, [field]: value } : subActivity
      )
    }));
  };

  const updateSubActivityFrequencyConfig = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      subactivities: prev.subactivities.map((subActivity, i) => 
        i === index ? { 
          ...subActivity, 
          frequencyConfig: {
            ...subActivity.frequencyConfig,
            [field]: value
          }
        } : subActivity
      )
    }));
  };

  const handleFrequencyConfigChange = (field: string, value: any) => {
    if (selectedSubActivityIndex !== null) {
      updateSubActivityFrequencyConfig(selectedSubActivityIndex, field, value);
    }
  };

  // Field management functions
  const addField = (subActivityIndex: number) => {
    setFormData(prev => ({
      ...prev,
      subactivities: prev.subactivities.map((subActivity, i) => 
        i === subActivityIndex ? {
          ...subActivity,
          fields: [...(subActivity.fields || []), {
            name: '',
            type: 'text'
          }]
        } : subActivity
      )
    }));
  };

  const removeField = (subActivityIndex: number, fieldIndex: number) => {
    setFormData(prev => ({
      ...prev,
      subactivities: prev.subactivities.map((subActivity, i) => 
        i === subActivityIndex ? {
          ...subActivity,
          fields: (subActivity.fields || []).filter((_, fi) => fi !== fieldIndex)
        } : subActivity
      )
    }));
  };

  const updateField = (subActivityIndex: number, fieldIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      subactivities: prev.subactivities.map((subActivity, i) => 
        i === subActivityIndex ? {
          ...subActivity,
          fields: (subActivity.fields || []).map((f, fi) => 
            fi === fieldIndex ? { ...f, [field]: value } : f
          )
        } : subActivity
      )
    }));
  };

  const validateSubActivityFrequencyConfig = (frequency: string, config: any) => {
    if (!config) return false;
    switch (frequency) {
      case 'Hourly':
        return config.hourlyInterval > 0;
      case 'Daily':
        return config.dailyTime !== '';
      case 'Weekly':
        return config.weeklyDays && config.weeklyDays.length > 0 && config.weeklyTime !== '';
      case 'Monthly':
        return config.monthlyDay > 0 && config.monthlyDay <= 31 && config.monthlyTime !== '';
      case 'Quarterly':
        return config.quarterlyMonths && config.quarterlyMonths.length > 0 && config.quarterlyDay > 0 && config.quarterlyDay <= 31 && config.quarterlyTime !== '';
      case 'Yearly':
        return config.yearlyMonth !== '' && config.yearlyDate > 0 && config.yearlyDate <= 31 && config.yearlyTime !== '';
      default:
        return false;
    }
  };

  const getSubActivityFrequencyConfigStatus = (subActivity: { frequency?: string; frequencyConfig?: any }) => {
    if (!subActivity.frequency || subActivity.frequency === 'None') return 'Not configured';
    return validateSubActivityFrequencyConfig(subActivity.frequency, subActivity.frequencyConfig) ? 'Configured' : 'Incomplete';
  };

  const getSubActivityFrequencyConfigStatusColor = (subActivity: { frequency?: string; frequencyConfig?: any }) => {
    if (!subActivity.frequency || subActivity.frequency === 'None') return 'text-gray-500';
    return validateSubActivityFrequencyConfig(subActivity.frequency, subActivity.frequencyConfig) ? 'text-green-600' : 'text-red-600';
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
    
    try {
      setIsLoading(true);

      // Remove empty fields from request body
      const cleanedFormData = {
        name: formData.name,
        sortOrder: formData.sortOrder,
        subactivities: formData.subactivities
          .filter(subActivity => subActivity.name.trim() !== '')
          .map(subActivity => {
            // Only include frequency config if frequency is selected
            let cleanFrequencyConfig: any = undefined;
            if (subActivity.frequency && subActivity.frequency !== 'None') {
              cleanFrequencyConfig = {};
              
              // Only include relevant config based on frequency type
              switch (subActivity.frequency) {
                case 'Hourly':
                  if (subActivity.frequencyConfig?.hourlyInterval) {
                    cleanFrequencyConfig.hourlyInterval = subActivity.frequencyConfig.hourlyInterval;
                  }
                  break;
                case 'Daily':
                  if (subActivity.frequencyConfig?.dailyTime) {
                    cleanFrequencyConfig.dailyTime = subActivity.frequencyConfig.dailyTime;
                  }
                  break;
                case 'Weekly':
                  if (subActivity.frequencyConfig?.weeklyDays?.length > 0) {
                    cleanFrequencyConfig.weeklyDays = subActivity.frequencyConfig.weeklyDays;
                  }
                  if (subActivity.frequencyConfig?.weeklyTime) {
                    cleanFrequencyConfig.weeklyTime = subActivity.frequencyConfig.weeklyTime;
                  }
                  break;
                case 'Monthly':
                  if (subActivity.frequencyConfig?.monthlyDay) {
                    cleanFrequencyConfig.monthlyDay = subActivity.frequencyConfig.monthlyDay;
                  }
                  if (subActivity.frequencyConfig?.monthlyTime) {
                    cleanFrequencyConfig.monthlyTime = subActivity.frequencyConfig.monthlyTime;
                  }
                  break;
                case 'Quarterly':
                  if (subActivity.frequencyConfig?.quarterlyMonths?.length > 0) {
                    cleanFrequencyConfig.quarterlyMonths = subActivity.frequencyConfig.quarterlyMonths;
                  }
                  if (subActivity.frequencyConfig?.quarterlyDay) {
                    cleanFrequencyConfig.quarterlyDay = subActivity.frequencyConfig.quarterlyDay;
                  }
                  if (subActivity.frequencyConfig?.quarterlyTime) {
                    cleanFrequencyConfig.quarterlyTime = subActivity.frequencyConfig.quarterlyTime;
                  }
                  break;
                case 'Yearly':
                  if (subActivity.frequencyConfig?.yearlyMonth) {
                    cleanFrequencyConfig.yearlyMonth = subActivity.frequencyConfig.yearlyMonth;
                  }
                  if (subActivity.frequencyConfig?.yearlyDate) {
                    cleanFrequencyConfig.yearlyDate = subActivity.frequencyConfig.yearlyDate;
                  }
                  if (subActivity.frequencyConfig?.yearlyTime) {
                    cleanFrequencyConfig.yearlyTime = subActivity.frequencyConfig.yearlyTime;
                  }
                  break;
              }
              
              // Only include frequencyConfig if it has properties
              if (Object.keys(cleanFrequencyConfig).length === 0) {
                cleanFrequencyConfig = undefined;
              }
            }

            return {
              name: subActivity.name,
              frequency: subActivity.frequency || undefined,
              frequencyConfig: cleanFrequencyConfig,
              fields: subActivity.fields?.filter(field => field.name.trim() !== '') || undefined
            };
          })
      };

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

  const getFieldTypeOptions = () => {
    return [
      { value: 'text', label: 'Text' },
      { value: 'textarea', label: 'Text Area' },
      { value: 'number', label: 'Number' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
      { value: 'date', label: 'Date' },
      { value: 'select', label: 'Select Dropdown' },
      { value: 'checkbox', label: 'Checkbox' },
      { value: 'radio', label: 'Radio Buttons' },
      { value: 'file', label: 'File Upload' }
    ];
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







                  {/* Sub-Activities */}
                  <div className="form-group col-span-1 md:col-span-2">
                    <div className="flex justify-between items-center mb-3">
                      <label className="form-label">Sub-Activities</label>
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary text-sm"
                        onClick={addSubActivity}
                      >
                        <i className="ri-add-line mr-1"></i>
                        Add Sub-Activity
                      </button>
                    </div>
                    
                    {formData.subactivities.length === 0 ? (
                      <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                        <i className="ri-list-check text-2xl mb-2 opacity-50"></i>
                        <p className="text-sm">No sub-activities added yet</p>
                        <p className="text-xs">Click "Add Sub-Activity" to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {formData.subactivities.map((subActivity, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              {/* Sub-activity Name */}
                              <div className="form-group">
                                <label className="form-label">Sub-Activity Name <span className="text-red-500">*</span></label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder={`Enter sub-activity ${index + 1} name`}
                                  value={subActivity.name}
                                  onChange={(e) => updateSubActivity(index, 'name', e.target.value)}
                                />
                              </div>

                              {/* Frequency */}
                              <div className="form-group">
                                <label className="form-label">Due Date Options</label>
                                <select
                                  className="form-select"
                                  value={subActivity.frequency || ''}
                                  onChange={(e) => updateSubActivity(index, 'frequency', e.target.value)}
                                >
                                  <option value="">Select Frequency (Optional)</option>
                                  {getFrequencyOptions().map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Frequency Configuration */}
                            {subActivity.frequency && subActivity.frequency !== 'None' && (
                              <div className="form-group mb-4">
                                <label className="form-label">Due Date Configuration</label>
                                <button
                                  type="button"
                                  className={`w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary hover:bg-gray-50`}
                                  onClick={() => {
                                    setSelectedSubActivityIndex(index);
                                    setShowFrequencyModal(true);
                                  }}
                                >
                                  <span className={getSubActivityFrequencyConfigStatusColor(subActivity)}>
                                    {getSubActivityFrequencyConfigStatus(subActivity)}
                                  </span>
                                  <i className="ri-settings-3-line text-gray-400"></i>
                                </button>
                              </div>
                            )}

                            {/* Custom Fields */}
                            <div className="form-group mb-4">
                              <div className="flex justify-between items-center mb-3">
                                <label className="form-label">Custom Fields</label>
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-outline-primary text-sm"
                                  onClick={() => addField(index)}
                                >
                                  <i className="ri-add-line mr-1"></i>
                                  Add More Fields
                                </button>
                              </div>
                              
                              {(subActivity.fields || []).length === 0 ? (
                                <div className="text-center py-4 text-gray-400 border border-dashed border-gray-300 rounded-lg">
                                  <i className="ri-form-line text-lg mb-1 opacity-50"></i>
                                  <p className="text-xs">No custom fields added yet</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {(subActivity.fields || []).map((field, fieldIndex) => (
                                    <div key={fieldIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Field Name */}
                                        <div className="form-group">
                                          <label className="form-label text-sm">Field Name <span className="text-red-500">*</span></label>
                                          <input
                                            type="text"
                                            className="form-control text-sm"
                                            placeholder="e.g., Due Date, Priority, Notes"
                                            value={field.name}
                                            onChange={(e) => updateField(index, fieldIndex, 'name', e.target.value)}
                                          />
                                        </div>

                                        {/* Field Type */}
                                        <div className="form-group">
                                          <label className="form-label text-sm">Field Type <span className="text-red-500">*</span></label>
                                          <select
                                            className="form-select text-sm"
                                            value={field.type}
                                            onChange={(e) => updateField(index, fieldIndex, 'type', e.target.value)}
                                          >
                                            {getFieldTypeOptions().map(option => (
                                              <option key={option.value} value={option.value}>
                                                {option.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>

                                      {/* Remove Field Button */}
                                      <div className="flex justify-end mt-3">
                                        <button
                                          type="button"
                                          className="ti-btn ti-btn-danger text-xs"
                                          onClick={() => removeField(index, fieldIndex)}
                                          title="Remove field"
                                        >
                                          <i className="ri-delete-bin-line mr-1"></i>
                                          Remove Field
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Remove Button */}
                            <div className="flex justify-end">
                              <button
                                type="button"
                                className="ti-btn ti-btn-danger text-sm"
                                onClick={() => removeSubActivity(index)}
                                title="Remove sub-activity"
                              >
                                <i className="ri-delete-bin-line mr-1"></i>
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

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
                  Configure {selectedSubActivityIndex !== null && formData.subactivities[selectedSubActivityIndex]?.frequency} Frequency
                </h3>
                <button
                  onClick={() => setShowFrequencyModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>

              <div className="p-6">
                {selectedSubActivityIndex !== null && formData.subactivities[selectedSubActivityIndex]?.frequency === 'Hourly' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Hourly Interval <span className="text-red-500">*</span></label>
                      <select
                        className="form-select"
                        value={formData.subactivities[selectedSubActivityIndex]?.frequencyConfig?.hourlyInterval || 1}
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

                {selectedSubActivityIndex !== null && formData.subactivities[selectedSubActivityIndex]?.frequency === 'Daily' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Daily Time <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        className="form-control"
                        value={formData.subactivities[selectedSubActivityIndex]?.frequencyConfig?.dailyTime || ''}
                        onChange={(e) => handleFrequencyConfigChange('dailyTime', e.target.value)}
                      />
                      <small className="text-gray-500">Time of day for the activity</small>
                    </div>
                  </div>
                )}

                {selectedSubActivityIndex !== null && formData.subactivities[selectedSubActivityIndex]?.frequency === 'Weekly' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Days of Week <span className="text-red-500">*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                          <label key={day} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="form-checkbox"
                              checked={formData.subactivities[selectedSubActivityIndex]?.frequencyConfig?.weeklyDays?.includes(day) || false}
                              onChange={(e) => {
                                const currentDays = formData.subactivities[selectedSubActivityIndex]?.frequencyConfig?.weeklyDays || [];
                                if (e.target.checked) {
                                  handleFrequencyConfigChange('weeklyDays', [...currentDays, day]);
                                } else {
                                  handleFrequencyConfigChange('weeklyDays', currentDays.filter((d: string) => d !== day));
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
                        value={formData.subactivities[selectedSubActivityIndex]?.frequencyConfig?.weeklyTime || ''}
                        onChange={(e) => handleFrequencyConfigChange('weeklyTime', e.target.value)}
                      />
                      <small className="text-gray-500">Time of day for the activity</small>
                    </div>
                  </div>
                )}

                {selectedSubActivityIndex !== null && formData.subactivities[selectedSubActivityIndex]?.frequency === 'Monthly' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Day of Month <span className="text-red-500">*</span></label>
                      <select
                        className="form-select"
                        value={formData.subactivities[selectedSubActivityIndex]?.frequencyConfig?.monthlyDay || 1}
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
                        value={formData.subactivities[selectedSubActivityIndex]?.frequencyConfig?.monthlyTime || ''}
                        onChange={(e) => handleFrequencyConfigChange('monthlyTime', e.target.value)}
                      />
                      <small className="text-gray-500">Time of day for the activity</small>
                    </div>
                  </div>
                )}

                {selectedSubActivityIndex !== null && formData.subactivities[selectedSubActivityIndex]?.frequency === 'Quarterly' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Quarterly Months <span className="text-red-500">*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        {['January', 'April', 'July', 'October'].map(month => (
                          <label key={month} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="form-checkbox"
                              checked={formData.subactivities[selectedSubActivityIndex]?.frequencyConfig?.quarterlyMonths?.includes(month) || false}
                              onChange={(e) => {
                                const currentMonths = formData.subactivities[selectedSubActivityIndex]?.frequencyConfig?.quarterlyMonths || [];
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
                        value={formData.subactivities[selectedSubActivityIndex]?.frequencyConfig?.quarterlyDay || 1}
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
                        value={formData.subactivities[selectedSubActivityIndex]?.frequencyConfig?.quarterlyTime || ''}
                        onChange={(e) => handleFrequencyConfigChange('quarterlyTime', e.target.value)}
                      />
                      <small className="text-gray-500">Time of day for the activity</small>
                    </div>
                  </div>
                )}

                {selectedSubActivityIndex !== null && formData.subactivities[selectedSubActivityIndex]?.frequency === 'Yearly' && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Month <span className="text-red-500">*</span></label>
                      <select
                        className="form-select"
                        value={formData.subactivities[selectedSubActivityIndex]?.frequencyConfig?.yearlyMonth || ''}
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
                        value={formData.subactivities[selectedSubActivityIndex]?.frequencyConfig?.yearlyDate || 1}
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
                        value={formData.subactivities[selectedSubActivityIndex]?.frequencyConfig?.yearlyTime || ''}
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
                    onClick={() => setShowFrequencyModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="ti-btn ti-btn-primary"
                    onClick={() => {
                      setShowFrequencyModal(false);
                      toast.success('Frequency configuration saved');
                    }}
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