import express from 'express';
import AppointmentSlot from '../models/AppointmentSlot.js';
import Appointment from '../models/Appointment.js';
import Customer from '../models/Customer.js';
import { isAuthenticated, hasRole } from '../middleware/auth.js';

const router = express.Router();

// ============ APPOINTMENT SLOTS ============

// Get all slots (with filters)
router.get('/slots', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    console.log('Fetching appointment slots...');
    const { date, type, status } = req.query;
    let filter = {};
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.date = { $gte: startDate, $lt: endDate };
    }
    if (type) filter.type = type;
    if (status) filter.status = status;

    console.log('Query filter:', filter);
    const slots = await AppointmentSlot.find(filter)
      .populate('assignedStaff', 'fullName')
      .sort({ date: 1, startTime: 1 });

    console.log('Found ' + slots.length + ' slots');
    res.json(slots);
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ message: 'Error fetching slots', error: error.message });
  }
});

// Create new slot
router.post('/slots', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const { date, startTime, endTime, type, capacity, assignedStaff, isBlocked, blockReason, internalNotes } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Parse date properly - it comes as YYYY-MM-DD from frontend
    let parsedDate;
    if (typeof date === 'string') {
      // Create date from YYYY-MM-DD format at midnight UTC
      const [year, month, day] = date.split('-');
      parsedDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    } else {
      parsedDate = new Date(date);
    }

    // Check for duplicate slot (same date and time)
    const existingSlot = await AppointmentSlot.findOne({
      date: parsedDate,
      startTime: startTime,
      endTime: endTime
    });

    if (existingSlot) {
      console.warn(`Duplicate slot attempt: ${startTime} - ${endTime} on ${date}`);
      return res.status(400).json({ message: `A slot already exists for ${startTime} - ${endTime} on this date` });
    }

    // Handle empty assignedStaff - convert to null/undefined
    const staffId = assignedStaff && assignedStaff.trim() !== '' ? assignedStaff : undefined;

    const newSlot = new AppointmentSlot({
      date: parsedDate,
      startTime,
      endTime,
      type,
      capacity: capacity || 1,
      assignedStaff: staffId,
      status: isBlocked ? 'blocked' : 'available',
      isBlocked: isBlocked || false,
      blockReason,
      internalNotes,
    });

    await newSlot.save();
    console.log(`New slot created: ${startTime} - ${endTime} on ${date}`);
    // Refetch with populated data
    const savedSlot = await AppointmentSlot.findById(newSlot._id).populate('assignedStaff', 'fullName');
    res.status(201).json({ message: 'Slot created successfully', slot: savedSlot });
  } catch (error) {
    console.error('Error creating slot:', error);
    res.status(500).json({ message: 'Error creating slot', error: error.message });
  }
});

// Update slot
router.patch('/slots/:slotId', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const { date, startTime, endTime, type, capacity, assignedStaff, isBlocked, blockReason, internalNotes } = req.body;

    // Handle empty assignedStaff - convert to null or omit from update
    const updateData = {
      startTime,
      endTime,
      type,
      capacity,
      assignedStaff: assignedStaff && assignedStaff.trim() !== '' ? assignedStaff : null,
      isBlocked,
      blockReason,
      internalNotes,
      status: isBlocked ? 'blocked' : (capacity && capacity > 0 ? 'available' : 'full'),
    };

    // Handle date parsing if provided
    if (date) {
      if (typeof date === 'string') {
        const [year, month, day] = date.split('-');
        updateData.date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
      } else {
        updateData.date = new Date(date);
      }
    }

    const slot = await AppointmentSlot.findByIdAndUpdate(
      req.params.slotId,
      updateData,
      { new: true }
    ).populate('assignedStaff', 'fullName');

    res.json({ message: 'Slot updated successfully', slot });
  } catch (error) {
    console.error('Error updating slot:', error);
    res.status(500).json({ message: 'Error updating slot', error: error.message });
  }
});

// Delete slot
router.delete('/slots/:slotId', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    await AppointmentSlot.findByIdAndDelete(req.params.slotId);
    res.json({ message: 'Slot deleted successfully' });
  } catch (error) {
    console.error('Error deleting slot:', error);
    res.status(500).json({ message: 'Error deleting slot' });
  }
});

// Block multiple slots (for holidays/leave)
router.post('/slots/block-multiple', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const { startDate, endDate, blockReason } = req.body;

    if (!startDate || !endDate || !blockReason) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Parse dates properly
    let start, end;
    if (typeof startDate === 'string') {
      const [year, month, day] = startDate.split('-');
      start = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    } else {
      start = new Date(startDate);
    }

    if (typeof endDate === 'string') {
      const [year, month, day] = endDate.split('-');
      end = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
      end.setDate(end.getDate() + 1); // Include the end date
    } else {
      end = new Date(endDate);
      end.setDate(end.getDate() + 1);
    }

    const result = await AppointmentSlot.updateMany(
      { date: { $gte: start, $lt: end } },
      { isBlocked: true, blockReason, status: 'blocked' }
    );

    res.json({ message: 'Slots blocked successfully', modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('Error blocking slots:', error);
    res.status(500).json({ message: 'Error blocking slots', error: error.message });
  }
});

// ============ APPOINTMENTS ============

// Customer: Get available slots for booking (public access to browse slots)
router.get('/available', async (req, res) => {
  try {
    const { date } = req.query;
    let filter = { isBlocked: false, status: 'available' };

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.date = { $gte: startDate, $lt: endDate };
    }

    const slots = await AppointmentSlot.find(filter)
      .populate('assignedStaff', 'fullName')
      .sort({ date: 1, startTime: 1 });

    res.json({ slots });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ message: 'Error fetching available slots' });
  }
});

// Customer: Book an appointment (accepts type selection from customer)
router.post('/book', isAuthenticated, async (req, res) => {
  try {
    const { slotId, type, notes } = req.body;
    const userId = req.user.id;

    if (!slotId || !type) {
      return res.status(400).json({ message: 'Slot ID and appointment type are required' });
    }

    // Get the slot
    const slot = await AppointmentSlot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    if (slot.isBlocked) {
      return res.status(400).json({ message: 'This slot is not available for booking' });
    }

    if (slot.status !== 'available') {
      return res.status(400).json({ message: 'This slot is no longer available' });
    }

    // Check capacity
    const bookedCount = await Appointment.countDocuments({ 
      slotId: slotId,
      status: { $ne: 'cancelled' }
    });

    if (bookedCount >= slot.capacity) {
      return res.status(400).json({ message: 'This slot is full' });
    }

    // Get customer data
    const customer = await Customer.findById(userId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Create appointment with customer data
    const newAppointment = new Appointment({
      slotId,
      customerId: userId,
      customerName: customer.fullName,
      customerEmail: customer.email,
      customerPhone: customer.phone || '',
      appointmentType: type,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      notes,
      assignedStaff: slot.assignedStaff,
      status: 'confirmed',
      isVIP: customer.loyaltyPoints > 500 // Mark as VIP if high loyalty
    });

    await newAppointment.save();
    console.log(`Appointment booked by customer ${userId}: Type=${type}, SlotId=${slotId}`);

    res.status(201).json({ 
      message: 'Appointment booked successfully',
      appointment: newAppointment 
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ message: 'Error booking appointment', error: error.message });
  }
});

// Customer: Get my bookings
router.get('/my-bookings', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;

    const bookings = await Appointment.find({ customerId: userId })
      .populate('slotId')
      .populate('assignedStaff', 'fullName')
      .sort({ date: -1 });

    res.json({ bookings });
  } catch (error) {
    console.error('Error fetching customer bookings:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

// Customer: Cancel their own appointment
router.delete('/:appointmentId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Verify the appointment belongs to the customer
    if (appointment.customerId.toString() !== userId) {
      return res.status(403).json({ message: 'You can only cancel your own appointments' });
    }

    // Update appointment status to cancelled
    appointment.status = 'cancelled';
    await appointment.save();

    console.log(`Appointment ${req.params.appointmentId} cancelled by customer ${userId}`);
    res.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ message: 'Error cancelling appointment' });
  }
});

// ============ STAFF/ADMIN APPOINTMENTS ============

// Get all appointments (with filters)
router.get('/', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const { status, date, customerId } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (date) {
      let startDate, endDate;
      if (typeof date === 'string') {
        const [year, month, day] = date.split('-');
        startDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
      } else {
        startDate = new Date(date);
      }
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      filter.date = { $gte: startDate, $lt: endDate };
    }

    const appointments = await Appointment.find(filter)
      .populate('slotId')
      .populate('assignedStaff', 'fullName')
      .sort({ date: -1 });

    // Calculate stats
    const stats = {
      total: appointments.length,
      completed: appointments.filter(a => a.status === 'completed').length,
      noShow: appointments.filter(a => a.status === 'no-show').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
    };

    res.json({ appointments, stats });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'Error fetching appointments' });
  }
});

// Create new appointment
router.post('/', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const { slotId, customerId, customerName, customerEmail, customerPhone, appointmentType, notes, isVIP } = req.body;

    if (!slotId || !customerId || !customerName || !customerEmail || !appointmentType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if slot exists and is available
    let slot = await AppointmentSlot.findById(slotId);
    if (!slot) {
      console.error(`Slot ${slotId} not found`);
      return res.status(404).json({ message: 'Slot not found' });
    }
    
    if (slot.isBlocked) {
      console.error(`Slot ${slotId} is blocked: ${slot.blockReason}`);
      return res.status(400).json({ message: 'Slot is blocked' });
    }
    
    // Double-check capacity (handle race conditions)
    if (slot.bookedCount >= slot.capacity) {
      console.error(`Slot ${slotId} is full: ${slot.bookedCount}/${slot.capacity} booked`);
      return res.status(400).json({ message: 'Slot is full - another customer just booked the last spot!' });
    }

    // Create appointment
    const newAppointment = new Appointment({
      slotId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      appointmentType,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      notes,
      isVIP,
      assignedStaff: slot.assignedStaff,
      status: 'confirmed',
    });

    await newAppointment.save();
    console.log(`Appointment created: ${newAppointment._id} for slot ${slotId}`);

    // Update slot booked count
    slot.bookedCount += 1;
    if (slot.bookedCount >= slot.capacity) {
      slot.status = 'full';
      console.log(`Slot ${slotId} is now FULL (${slot.bookedCount}/${slot.capacity})`);
    }
    await slot.save();

    res.status(201).json({ message: 'Appointment booked successfully', appointment: newAppointment });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ message: 'Error creating appointment', error: error.message });
  }
});

// Update appointment status
router.patch('/:appointmentId/status', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const { status, internalNotesAfter, cancelledReason, followUpNote, followUpSuggested } = req.body;

    if (!['confirmed', 'completed', 'no-show', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Get the current appointment to check its old status
    const currentAppointment = await Appointment.findById(req.params.appointmentId);
    const wasConfirmed = currentAppointment.status === 'confirmed';

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.appointmentId,
      {
        status,
        internalNotesAfter,
        cancelledReason,
        followUpNote,
        followUpSuggested,
      },
      { new: true }
    ).populate('slotId').populate('assignedStaff', 'fullName');

    // If appointment is being cancelled and was previously confirmed, decrement bookedCount
    if (status === 'cancelled' && wasConfirmed && appointment.slotId) {
      const slot = await AppointmentSlot.findById(appointment.slotId);
      if (slot && slot.bookedCount > 0) {
        slot.bookedCount -= 1;
        // Change status back to available if now below capacity
        if (slot.bookedCount < slot.capacity && slot.status === 'full') {
          slot.status = 'available';
        }
        await slot.save();
        console.log(`Slot ${appointment.slotId} bookedCount decremented to ${slot.bookedCount}`);
      }
    }

    res.json({ message: 'Appointment updated successfully', appointment });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ message: 'Error updating appointment', error: error.message });
  }
});

// Add internal notes
router.patch('/:appointmentId/notes', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const { internalNotesBefore, internalNotesAfter } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.appointmentId,
      {
        internalNotesBefore,
        internalNotesAfter,
      },
      { new: true }
    );

    res.json({ message: 'Notes updated successfully', appointment });
  } catch (error) {
    console.error('Error updating notes:', error);
    res.status(500).json({ message: 'Error updating notes' });
  }
});

// Get appointment stats/reports
router.get('/reports/summary', isAuthenticated, hasRole('Customer Care', 'Admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let filter = {};
    if (startDate && endDate) {
      let start, end;
      if (typeof startDate === 'string') {
        const [year, month, day] = startDate.split('-');
        start = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
      } else {
        start = new Date(startDate);
      }

      if (typeof endDate === 'string') {
        const [year, month, day] = endDate.split('-');
        end = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
        end.setDate(end.getDate() + 1); // Include the end date
      } else {
        end = new Date(endDate);
        end.setDate(end.getDate() + 1);
      }

      filter.date = {
        $gte: start,
        $lt: end,
      };
    }

    const appointments = await Appointment.find(filter);

    const report = {
      totalBookings: appointments.length,
      completed: appointments.filter(a => a.status === 'completed').length,
      noShows: appointments.filter(a => a.status === 'no-show').length,
      cancellations: appointments.filter(a => a.status === 'cancelled').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      byType: {},
      noShowsWithoutFollowUp: appointments.filter(a => a.status === 'no-show' && !a.followUpSuggested),
      cancellationsWithoutFollowUp: appointments.filter(a => a.status === 'cancelled' && !a.followUpSuggested),
    };

    // Group by appointment type
    appointments.forEach(apt => {
      if (!report.byType[apt.appointmentType]) {
        report.byType[apt.appointmentType] = 0;
      }
      report.byType[apt.appointmentType]++;
    });

    res.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Error generating report', error: error.message });
  }
});

export default router;
