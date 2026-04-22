import mongoose from 'mongoose';

const appointmentSlotSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String, // Format: "09:00"
      required: true,
    },
    endTime: {
      type: String, // Format: "10:00"
      required: true,
    },
    type: {
      type: String,
      enum: ['In-Store Consultation', 'Custom Order Meeting', 'Jewelry Fitting', 'Repair Drop-off', 'Resize', 'Valuation', 'Gift Consultation'],
      required: false,
      default: 'In-Store Consultation'
    },
    capacity: {
      type: Number,
      default: 1,
    },
    bookedCount: {
      type: Number,
      default: 0,
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockReason: {
      type: String, // "Holiday", "Staff Leave", "Maintenance", etc.
    },
    status: {
      type: String,
      enum: ['available', 'full', 'blocked'],
      default: 'available',
    },
    internalNotes: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model('AppointmentSlot', appointmentSlotSchema);
