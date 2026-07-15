import React, { useState, useRef } from 'react';
import { Upload, Plus, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import WhitelistApi from '../api/whitelistApi';
import './ActionForms.css';

export default function ActionForms({ onActionSuccess }) {
    // Form state 1: Single Number
    const [phoneNumber, setPhoneNumber] = useState('');
    const [singleLoading, setSingleLoading] = useState(false);
    const [singleMsg, setSingleMsg] = useState({ type: '', text: '' });

    // Form state 2: CSV Import
    const [serviceNo, setServiceNo] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [csvLoading, setCsvLoading] = useState(false);
    const [csvMsg, setCsvMsg] = useState({ type: '', text: '', errors: null });
    const fileInputRef = useRef(null);

    // Submit Handler: Add Single Phone Number[cite: 4]
    const handleSingleSubmit = async (e) => {
        e.preventDefault();
        if (!phoneNumber.trim()) return;

        setSingleLoading(true);
        setSingleMsg({ type: '', text: '' });

        const response = await WhitelistApi.addPhoneNumber(
            phoneNumber.trim(),
            'AdminUser', // PerformedBy
            'Manual single number addition'
        );

        if (response.success) {
            setSingleMsg({ type: 'success', text: `Success: ${phoneNumber} has been added!` });
            setPhoneNumber('');
            if (onActionSuccess) onActionSuccess(); // Refresh parents tables
        } else {
            setSingleMsg({ type: 'error', text: response.message || 'Failed to add phone number.' });
        }
        setSingleLoading(false);
    };

    // Submit Handler: CSV Bulk Import[cite: 4]
    const handleCsvSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFile || !serviceNo) return;

        setCsvLoading(true);
        setCsvMsg({ type: '', text: '', errors: null });

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('serviceNo', serviceNo);
        formData.append('performedBy', 'AdminUser');

        const response = await WhitelistApi.importCsv(formData); //[cite: 4]

        if (response.success) {
            setCsvMsg({
                type: 'success',
                text: `Successfully imported ${response.insertedCount} records!`
            });
            setServiceNo('');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (onActionSuccess) onActionSuccess();
        } else {
            setCsvMsg({
                type: 'error',
                text: response.message || 'Import failed.',
                errors: response.errors // Holds line-by-line errors
            });
        }
        setCsvLoading(false);
    };

    return (
        <div className="forms-wrapper">
            {/* Form 1: Add Single Number */}
            <div className="action-card">
                <h3>Add Single Phone Number</h3>
                <p className="card-subtitle">Manually add one specific number to the whitelist.</p>

                <form onSubmit={handleSingleSubmit}>
                    <div className="form-group">
                        <label htmlFor="phoneNumber">Phone Number</label>
                        <input
                            id="phoneNumber"
                            type="text"
                            className="form-control"
                            placeholder="+230 5123 4567"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            required
                        />
                    </div>

                    {singleMsg.text && (
                        <div className={`alert-banner ${singleMsg.type}`}>
                            {singleMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                            <span>{singleMsg.text}</span>
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" disabled={singleLoading}>
                        <Plus size={18} />
                        {singleLoading ? 'Adding...' : 'Add Number'}
                    </button>
                </form>
            </div>

            {/* Form 2: Bulk CSV Import */}
            <div className="action-card">
                <h3>Bulk CSV Import</h3>
                <p className="card-subtitle">Upload a list of phone numbers (must matches target format).</p>

                <form onSubmit={handleCsvSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="serviceNo">Service Number</label>
                            <input
                                id="serviceNo"
                                type="number"
                                className="form-control"
                                placeholder="e.g. 101"
                                value={serviceNo}
                                onChange={(e) => setServiceNo(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="csvFile">CSV File</label>
                            <input
                                id="csvFile"
                                type="file"
                                accept=".csv"
                                className="form-control file-input"
                                ref={fileInputRef}
                                onChange={(e) => setSelectedFile(e.target.files[0])}
                                required
                            />
                        </div>
                    </div>

                    {csvMsg.text && (
                        <div className={`alert-banner ${csvMsg.type}`}>
                            {csvMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                            <span>{csvMsg.text}</span>
                        </div>
                    )}

                    {/* Detailed lines errors if backend reject it */}
                    {csvMsg.errors && (
                        <div className="csv-errors-box">
                            <strong>Line violations found:</strong>
                            <ul>
                                {csvMsg.errors.map((err, idx) => (
                                    <li key={idx}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" disabled={csvLoading}>
                        <Upload size={18} />
                        {csvLoading ? 'Importing...' : 'Upload & Import'}
                    </button>
                </form>
            </div>
        </div>
    );
}