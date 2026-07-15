import React, { useState } from 'react';
import { FileSpreadsheet, Search, CheckCircle, XCircle, AlertCircle, Calendar } from 'lucide-react';
import './ImportTable.css';

/**
 * Table component displaying the CSV import history with search filter.
 */
export default function ImportTable({ imports }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Format date to readable string
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter list according to search query[cite: 6]
  const filteredImports = imports.filter((item) => {
    const filenameMatch = item.filename?.toLowerCase().includes(searchQuery.toLowerCase());
    const userMatch = item.imported_by?.toLowerCase().includes(searchQuery.toLowerCase());
    const serviceMatch = item.service_no?.toString().includes(searchQuery);
    return filenameMatch || userMatch || serviceMatch;
  });

  return (
    <div className="table-container">
      {/* Toolbar with Search Input[cite: 6] */}
      <div className="table-toolbar">
        <div className="search-box">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search by filename, service, or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="results-count">
          <span>{filteredImports.length} imports displayed</span>
        </div>
      </div>

      {/* Glassmorphic Table[cite: 6] */}
      <div className="glass-table-wrapper">
        <table className="glass-table">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Service</th>
              <th>Imported By</th>
              <th>Import Date</th>
              <th>Records</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredImports.length > 0 ? (
              filteredImports.map((item) => (
                <tr key={item.id} className="table-row">
                  <td className="col-filename">
                    <div className="file-cell">
                      <FileSpreadsheet className="file-icon" />
                      <span title={item.filename}>{item.filename || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="col-service">
                    <span className="service-tag">{item.service_no}</span>
                  </td>
                  <td className="col-user">
                    <span>{item.imported_by || 'system'}</span>
                  </td>
                  <td className="col-date">
                    <div className="date-cell">
                      <Calendar className="calendar-icon" />
                      <span>{formatDate(item.imported_at)}</span>
                    </div>
                  </td>
                  <td className="col-records">
                    <span className={`records-badge ${item.records_count > 0 ? 'has-records' : 'empty'}`}>
                      {item.records_count}
                    </span>
                  </td>
                  <td className="col-status">
                    {item.status === 'completed' && (
                      <span className="status-badge success">
                        <CheckCircle className="status-icon" />
                        <span>Completed</span>
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span className="status-badge danger">
                        <XCircle className="status-icon" />
                        <span>Failed</span>
                      </span>
                    )}
                    {item.status === 'pending' && (
                      <span className="status-badge warning">
                        <AlertCircle className="status-icon" />
                        <span>Pending</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-table-cell">
                  <div className="empty-state">
                    <FileSpreadsheet className="empty-icon" />
                    <p className="empty-title">No imports found</p>
                    <p className="empty-desc">No rows matches your search filters.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}