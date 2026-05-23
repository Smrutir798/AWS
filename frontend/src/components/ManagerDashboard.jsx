import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Check, X, Users, FileText } from 'lucide-react';
import axios from 'axios';

export default function ManagerDashboard({ user, setUser }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const updateLeaveStatus = async (id, status) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/leaves/${id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setLeaves(leaves.map(l => l.id === id ? { ...l, status } : l));
      
      // Show mock notification alert
      setTimeout(() => {
        alert(`Status updated to ${status}. Notification sent to employee via AWS SNS/SES.`);
      }, 100);
      
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (fileName) => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`http://localhost:5000/api/documents/${fileName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.open(data.viewUrl, '_blank');
    } catch (err) {
      console.error(err);
      alert('Failed to load document');
    }
  };

  return (
    <div>
      <nav className="navbar">
        <div className="nav-brand">
          <Users color="var(--success)" />
          <span>Manager Portal</span>
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
          <h2>Team Leave Requests</h2>
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            <span className="text-muted">Total Pending: </span>
            <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>
              {leaves.filter(l => l.status === 'Pending').length}
            </span>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel" style={{ padding: '1rem' }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type & Reason</th>
                  <th>Dates</th>
                  <th>Document</th>
                  <th>Status</th>
                  <th>Actions</th>
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
                      <td>
                        <div style={{ fontWeight: 600 }}>{leave.employeeName}</div>
                        <div className="text-sm text-muted mt-1">ID: EMP-{leave.employeeId.toString().padStart(3, '0')}</div>
                      </td>
                      <td>
                        <div>{leave.type}</div>
                        <div className="text-sm text-muted mt-1">{leave.reason}</div>
                      </td>
                      <td>
                        <div>{leave.startDate}</div>
                        <div className="text-muted text-sm mt-1">to {leave.endDate}</div>
                      </td>
                      <td>
                        {leave.documentUrl ? (
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            onClick={() => handleViewDocument(leave.documentUrl)}
                            title="View Document"
                          >
                            <FileText size={16} /> View
                          </button>
                        ) : (
                          <span className="text-muted text-sm">None</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${leave.status.toLowerCase()}`}>{leave.status}</span>
                      </td>
                      <td>
                        {leave.status === 'Pending' ? (
                          <div className="flex gap-2">
                            <button 
                              className="btn btn-success" 
                              style={{ padding: '0.5rem' }} 
                              title="Approve"
                              onClick={() => updateLeaveStatus(leave.id, 'Approved')}
                              disabled={loading}
                            >
                              <Check size={18} />
                            </button>
                            <button 
                              className="btn btn-danger" 
                              style={{ padding: '0.5rem' }} 
                              title="Reject"
                              onClick={() => updateLeaveStatus(leave.id, 'Rejected')}
                              disabled={loading}
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted">Processed</span>
                        )}
                      </td>
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
