import mongoose from 'mongoose';

const staffAuditLogSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  staffName: {
    type: String,
    default: 'Unknown'
  },
  staffRole: {
    type: String,
    default: 'Unknown'
  },
  method: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  statusCode: {
    type: Number,
    required: true
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  query: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  body: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

staffAuditLogSchema.index({ createdAt: -1 });
staffAuditLogSchema.index({ staffId: 1, createdAt: -1 });
staffAuditLogSchema.index({ path: 1, createdAt: -1 });

const StaffAuditLog = mongoose.model('StaffAuditLog', staffAuditLogSchema);

export default StaffAuditLog;
