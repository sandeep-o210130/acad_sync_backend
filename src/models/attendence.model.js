import mongoose, { Schema } from 'mongoose';
import { availbleAcadmicYears, availbleClasses } from '../constants.js';

const attendanceSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    class: {
      type: String,
      enum: [...availbleClasses, null],
    },
    year: {
      type: String,
      enum: [...availbleAcadmicYears, null],
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT'],
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ student: 1, subject: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
