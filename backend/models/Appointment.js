import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AppointmentSlot',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerEmail: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
    },
    isVIP: {
      type: Boolean,
      default: false,
    },
    appointmentType: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['confirmed', 'completed', 'no-show', 'cancelled'],
      default: 'confirmed',
    },
    notes: {
      type: String,
    },
    internalNotesBefore: {
      type: String,
    },
    internalNotesAfter: {
      type: String,
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
    },
    cancelledReason: {
      type: String,
    },
    followUpSuggested: {
      type: Boolean,
      default: false,
    },
    followUpNote: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Appointment', appointmentSchema);
