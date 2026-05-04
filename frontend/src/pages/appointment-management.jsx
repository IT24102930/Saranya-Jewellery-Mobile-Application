import React, { useState, useEffect } from 'react';
import '../styles.css';

const defaultApiBase =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : `http://${window.location.hostname}:3000/api`;

const API_URL = import.meta.env.VITE_API_URL || defaultApiBase;

export default function AppointmentManagement() {
  const [slots, setSlots] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState({ date: '', type: '', status: '' });
  const [editingSlot, setEditingSlot] = useState(null);

  const [newSlot, setNewSlot] = useState({
    date: '',
    startTime: '',
    endTime: '',
    type: 'appointment',
    capacity: 1,
    assignedStaff: '',
    isBlocked: false,
    blockReason: '',
    internalNotes: '',
  });

  // Fetch slots and staff on component mount
  useEffect(() => {
    fetchSlots();
    fetchStaff();
  }, []);

  const fetchSlots = async () => {
    try {
      const response = await fetch(`${API_URL}/appointments/slots`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setSlots(data.slots || []);
      }
    } catch (error) {
      setError('Failed to fetch slots: ' + error.message);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch(`${API_URL}/staff`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setStaff(data.staff || []);
      }
    } catch (error) {
      console.log('Could not fetch staff:', error.message);
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate required fields
    if (!newSlot.date || !newSlot.startTime || !newSlot.endTime) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    const selectedDate = new Date(newSlot.date);
    const dateStr = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Check for duplicate slot on frontend first
    const isDuplicate = slots.some(slot => {
      const slotDate = new Date(slot.date).toISOString().split('T')[0];
      return slotDate === dateStr && 
             slot.startTime === newSlot.startTime && 
             slot.endTime === newSlot.endTime;
    });

    if (isDuplicate) {
      setError(`A slot already exists for ${newSlot.startTime} - ${newSlot.endTime} on this date`);
      setLoading(false);
      return;
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newSlot.startTime) || !timeRegex.test(newSlot.endTime)) {
      setError('Invalid time format. Use HH:MM');
      setLoading(false);
      return;
    }

    // Validate start time is before end time
    if (newSlot.startTime >= newSlot.endTime) {
      setError('Start time must be before end time');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...newSlot,
        date: dateStr,
      };

      const response = await fetch(`${API_URL}/appointments/slots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to create slot');
        return;
      }

      setSlots([...slots, data.slot]);
      setNewSlot({ 
        date: '', 
        startTime: '', 
        endTime: '', 
        type: 'appointment', 
        capacity: 1, 
        assignedStaff: '', 
        isBlocked: false, 
        blockReason: '', 
        internalNotes: '' 
      });
      setSuccess('Slot created successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Error creating slot: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSlot = async (e) => {
    e.preventDefault();
    if (!editingSlot) return;

    setLoading(true);
    setError('');

    try {
      const payload = {
        ...editingSlot,
        date: new Date(editingSlot.date).toISOString().split('T')[0],
      };

      const response = await fetch(`${API_URL}/appointments/slots/${editingSlot._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to update slot');
        return;
      }

      setSlots(slots.map(s => s._id === editingSlot._id ? data.slot : s));
      setEditingSlot(null);
      setSuccess('Slot updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Error updating slot: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to delete this slot?')) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/appointments/slots/${slotId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        setSlots(slots.filter(s => s._id !== slotId));
        setSuccess('Slot deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to delete slot');
      }
    } catch (error) {
      setError('Error deleting slot: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSlots = slots.filter(slot => {
    const slotDate = new Date(slot.date).toISOString().split('T')[0];
    const dateMatch = !filter.date || slotDate === filter.date;
    const typeMatch = !filter.type || slot.type === filter.type;
    const statusMatch = !filter.status || slot.status === filter.status;
    return dateMatch && typeMatch && statusMatch;
  });

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Appointment Slot Management</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="dashboard-content">
        {/* Create New Slot Form */}
        <div className="card">
          <h2>Create New Slot</h2>
          <form onSubmit={handleAddSlot} className="form">
            <div className="form-row">
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={newSlot.date}
                  onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Start Time (HH:MM) *</label>
                <input
                  type="time"
                  value={newSlot.startTime}
                  onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Time (HH:MM) *</label>
                <input
                  type="time"
                  value={newSlot.endTime}
                  onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Type</label>
                <select
                  value={newSlot.type}
                  onChange={(e) => setNewSlot({ ...newSlot, type: e.target.value })}
                >
                  <option value="appointment">Appointment</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="consultation">Consultation</option>
                </select>
              </div>
              <div className="form-group">
                <label>Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newSlot.capacity}
                  onChange={(e) => setNewSlot({ ...newSlot, capacity: parseInt(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>Assign Staff</label>
                <select
                  value={newSlot.assignedStaff}
                  onChange={(e) => setNewSlot({ ...newSlot, assignedStaff: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {staff.map(s => (
                    <option key={s._id} value={s._id}>{s.fullName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={newSlot.isBlocked}
                    onChange={(e) => setNewSlot({ ...newSlot, isBlocked: e.target.checked })}
                  />
                  Block This Slot
                </label>
              </div>
              {newSlot.isBlocked && (
                <div className="form-group">
                  <label>Block Reason</label>
                  <input
                    type="text"
                    placeholder="e.g., Staff holiday, Maintenance"
                    value={newSlot.blockReason}
                    onChange={(e) => setNewSlot({ ...newSlot, blockReason: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Internal Notes</label>
              <textarea
                placeholder="Internal notes for staff..."
                value={newSlot.internalNotes}
                onChange={(e) => setNewSlot({ ...newSlot, internalNotes: e.target.value })}
                rows="3"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Slot'}
            </button>
          </form>
        </div>

        {/* Filters */}
        <div className="card">
          <h3>Filter Slots</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={filter.date}
                onChange={(e) => setFilter({ ...filter, date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                value={filter.type}
                onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              >
                <option value="">All Types</option>
                <option value="appointment">Appointment</option>
                <option value="follow-up">Follow-up</option>
                <option value="consultation">Consultation</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="available">Available</option>
                <option value="booked">Booked</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <button className="btn btn-secondary" onClick={() => setFilter({ date: '', type: '', status: '' })}>
              Clear Filters
            </button>
          </div>
        </div>

        {/* Slots Table */}
        <div className="card">
          <h3>Appointment Slots ({filteredSlots.length})</h3>
          {filteredSlots.length === 0 ? (
            <p>No slots found</p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Capacity</th>
                    <th>Assigned Staff</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSlots.map(slot => (
                    <tr key={slot._id}>
                      <td>{new Date(slot.date).toLocaleDateString()}</td>
                      <td>{slot.startTime} - {slot.endTime}</td>
                      <td>{slot.type}</td>
                      <td>{slot.capacity}</td>
                      <td>{slot.assignedStaff?.fullName || 'Unassigned'}</td>
                      <td>
                        <span className={`badge badge-${slot.status}`}>
                          {slot.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setEditingSlot(slot)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteSlot(slot._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingSlot && (
        <div className="modal-overlay" onClick={() => setEditingSlot(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Slot</h2>
            <form onSubmit={handleUpdateSlot} className="form">
              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={new Date(editingSlot.date).toISOString().split('T')[0]}
                    onChange={(e) => setEditingSlot({ ...editingSlot, date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={editingSlot.startTime}
                    onChange={(e) => setEditingSlot({ ...editingSlot, startTime: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={editingSlot.endTime}
                    onChange={(e) => setEditingSlot({ ...editingSlot, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={editingSlot.type}
                    onChange={(e) => setEditingSlot({ ...editingSlot, type: e.target.value })}
                  >
                    <option value="appointment">Appointment</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="consultation">Consultation</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={editingSlot.capacity}
                    onChange={(e) => setEditingSlot({ ...editingSlot, capacity: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editingSlot.status}
                    onChange={(e) => setEditingSlot({ ...editingSlot, status: e.target.value })}
                  >
                    <option value="available">Available</option>
                    <option value="booked">Booked</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Internal Notes</label>
                <textarea
                  value={editingSlot.internalNotes || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, internalNotes: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="modal-buttons">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Slot'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingSlot(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
