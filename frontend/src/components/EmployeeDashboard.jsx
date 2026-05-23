import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Plus, CloudUpload, Calendar } from 'lucide-react';
import axios from 'axios';

export default function EmployeeDashboard({ user, setUser }) {
  const [leaves, setLeaves] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ startDate: '', endDate: '', reason: '', type: 'Annual Leave', documentUrl: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchLeaves = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/leaves', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeaves(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/leaves', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowForm(false);
      setFormData({ startDate: '', endDate: '', reason: '', type: 'Annual Leave', documentUrl: '' });
      setSelectedFile(null);
      fetchLeaves();
    } catch (err) {
      console.error(err);
      alert('Failed to submit leave request');
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleS3Upload = async () => {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const token = localStorage.getItem('token');
      
      const uploadData = new FormData();
      uploadData.append('file', selectedFile);

      // Upload file directly through the backend proxy
      const { data } = await axios.post(`http://localhost:5000/api/upload`, uploadData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      alert(`Document successfully uploaded!`);
      setFormData({...formData, documentUrl: data.fileName});
    } catch (err) {
      console.error(err);
      alert('Failed to upload document. Check console for details.');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  return (
    <div>
      <nav className="navbar">
        <div className="nav-brand">
          <Calendar color="var(--primary-color)" />
          <span>Employee Portal</span>
        </div>
        <div className="nav-profile">
          <span className="text-muted text-sm">Welcome, {user.name}</span>
          <button className="btn btn-outline" onClick={handleLogout} style={{ padding: '0.5rem 1rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <div className="container mt-4">
        <div className="flex justify-between items-center mb-8">
          <h2>My Leave Requests</h2>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={20} /> {showForm ? 'Cancel' : 'Apply for Leave'}
          </button>
        </div>

        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="glass-panel mb-8"
            style={{ padding: '2rem', overflow: 'hidden' }}
          >
            <h3 className="mb-6">New Leave Application</h3>
            <form onSubmit={handleSubmit} className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted mb-2 block">Start Date</label>
                  <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} required />
                </div>
                <div>
                  <label className="text-sm text-muted mb-2 block">End Date</label>
                  <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} required />
                </div>
              </div>
              
              <div>
                <label className="text-sm text-muted mb-2 block">Leave Type</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option>Annual Leave</option>
                  <option>Sick Leave</option>
                  <option>Unpaid Leave</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-muted mb-2 block">Reason</label>
                <textarea rows="3" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} required />
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--glass-border)' }}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted">Supporting Document (Medical Certificate)</span>
                  <div className="flex gap-2">
                    <input 
                      type="file" 
                      onChange={handleFileChange} 
                      style={{ display: 'none' }} 
                      id="file-upload" 
                      disabled={uploading || formData.documentUrl}
                    />
                    <label htmlFor="file-upload" className="btn btn-outline" style={{ padding: '0.5rem', marginBottom: 0, cursor: 'pointer', opacity: (uploading || formData.documentUrl) ? 0.5 : 1 }}>
                      Select File
                    </label>
                    <button type="button" className="btn btn-outline" onClick={handleS3Upload} disabled={uploading || !selectedFile || formData.documentUrl} style={{ marginBottom: 0 }}>
                      <CloudUpload size={16} /> {uploading ? 'Uploading...' : formData.documentUrl ? 'Uploaded' : 'Upload to S3'}
                    </button>
                  </div>
                </div>
                {selectedFile && !formData.documentUrl && <div className="text-sm mb-2" style={{ color: 'var(--primary-color)' }}>Selected: {selectedFile.name}</div>}
                {formData.documentUrl && <div className="text-sm mb-2" style={{ color: 'var(--success)' }}>✓ Document uploaded successfully</div>}
                {uploadProgress > 0 && !formData.documentUrl && (
                  <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${uploadProgress}%`, background: 'var(--success)', height: '100%', borderRadius: '2px', transition: 'width 0.2s' }}></div>
                  </div>
                )}
                <p className="text-sm text-muted mt-2" style={{ fontSize: '0.75rem' }}>* Files are securely uploaded directly to Amazon S3 via Presigned URLs.</p>
              </div>

              <button type="submit" className="btn btn-primary" style={{ justifySelf: 'start' }}>Submit Request</button>
            </form>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-panel" style={{ padding: '1rem' }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Applied On</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-muted" style={{ padding: '2rem' }}>No leave requests found.</td>
                  </tr>
                ) : (
                  leaves.map(leave => (
                    <tr key={leave.id}>
                      <td style={{ fontWeight: 500 }}>{leave.type}</td>
                      <td>{leave.startDate} to {leave.endDate}</td>
                      <td className="text-muted">{leave.reason}</td>
                      <td>
                        <span className={`badge ${leave.status.toLowerCase()}`}>{leave.status}</span>
                      </td>
                      <td className="text-muted text-sm">{new Date(leave.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
