import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Phone, Trash2 } from 'lucide-react';
import WhitelistApi from '../../api/whitelistApi'; // Adjust the import path
import './WhitelistTable.css';

/**
 * Table component displaying whitelisted phone numbers, with search, deletion, and success alerts.
 */
export default function WhitelistTable({ list, onRefresh }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Local copy of the list, used for an immediate (optimistic) update
  // of the display without waiting for the parent to finish refreshing its data.
  const [localList, setLocalList] = useState(list);

  // States for the confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [phoneToDelete, setPhoneToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // State for the success message after deletion
  const [successMessage, setSuccessMessage] = useState('');

  // Keep the local copy in sync whenever the parent sends a new list
  useEffect(() => {
    setLocalList(list);
  }, [list]);

  // Filter by phone number
  const filteredList = localList.filter((item) => {
    return item.phone_number?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Opens the confirmation modal
  const handleDeleteClick = (phoneNumber) => {
    setPhoneToDelete(phoneNumber);
    setErrorMessage('');
    setShowConfirmModal(true);
  };

  // Cancels the deletion and closes the modal
  const handleCancelDelete = () => {
    setPhoneToDelete(null);
    setShowConfirmModal(false);
  };

  // Performs the deletion after confirmation in the modal
  const handleConfirmDelete = async () => {
    if (!phoneToDelete) return;

    setIsDeleting(true);
    setErrorMessage('');

    try {
      const response = await WhitelistApi.removePhoneNumber(
        phoneToDelete, 
        'Admin', // User performing the action
        'Manual deletion from the interface'
      );

      if (response.success) {
        // Store the deleted number for the success message before clearing state
        const deletedNumber = phoneToDelete;

        // Optimistic update: immediately remove the number from the display,
        // without waiting for onRefresh to return. This guarantees the table
        // updates right away, even if the parent's refresh is slow
        // or fails silently.
        setLocalList((prev) => prev.filter((item) => item.phone_number !== deletedNumber));

        setShowConfirmModal(false);
        setPhoneToDelete(null);

        // Trigger the temporary success message
        setSuccessMessage(`Number: ${deletedNumber} deleted successfully!`);

        // Automatically refresh the list of numbers from the server
        // (in the background; if it fails, the display remains correct thanks to the optimistic update above)
        if (onRefresh) {
          try {
            await onRefresh();
          } catch (refreshError) {
            // Silently ignored: local state is already up to date
          }
        }
      } else {
        setErrorMessage(response.message || "Unable to delete the number.");
      }
    } catch (error) {
      setErrorMessage("A network error occurred.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Effect to hide the success message after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
      return () => clearTimeout(timer); // Clean up the timer if the component unmounts
    }
  }, [successMessage]);

  return (
    <div className="table-container">
      {/* Success alert displayed at the top of the table */}
      {successMessage && (
        <div className="alert-success-banner">
          <ShieldCheck className="alert-success-icon" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="table-toolbar">
        <div className="search-box">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search a phone number (+230...)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="results-count">
          <span>{filteredList.length} numbers displayed</span>
        </div>
      </div>

      <div className="glass-table-wrapper">
        <table className="glass-table">
          <thead>
            <tr>
              <th>Telephone Number</th>
              <th>Status</th>
              <th className="col-action-header">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length > 0 ? (
              filteredList.map((item) => (
                <tr key={item.id} className="table-row">
                  <td className="col-phone">
                    <div className="phone-cell">
                      <Phone className="phone-icon" />
                      <span>{item.phone_number}</span>
                    </div>
                  </td>
                  <td className="col-status">
                    <span className="status-badge success">
                      <span>{item.status}</span>
                    </span>
                  </td>
                  <td className="col-action">
                    <button 
                      className="delete-action-btn"
                      onClick={() => handleDeleteClick(item.phone_number)}
                      title="Remove from the system"
                    >
                      <Trash2 className="trash-icon" />
                      <span>Delete</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="empty-table-cell">
                  <div className="empty-state">
                    <ShieldCheck className="empty-icon" />
                    <p className="empty-title">No number found</p>
                    <p className="empty-desc">No phone number matches your criteria.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Deletion confirmation pop-up (Modal) */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Confirm deletion</h3>
            <p className="modal-body">
              Are you sure you want to remove the number <strong>{phoneToDelete}</strong> from the whitelist?
              This action will be logged in the audit trail.
            </p>

            {errorMessage && (
              <div className="modal-error-alert">
                {errorMessage}
              </div>
            )}

            <div className="modal-actions">
              <button 
                className="modal-btn-cancel" 
                onClick={handleCancelDelete}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="modal-btn-confirm" 
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Confirm deletion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}