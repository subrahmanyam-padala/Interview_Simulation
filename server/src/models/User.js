import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'recruiter'],
      default: 'user',
    },
    skills: {
      type: [String],
      default: ['JavaScript', 'React', 'Node.js'],
    },
    preferredDomain: {
      type: String,
      default: 'Software Engineering',
    },
    experienceLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Senior', 'Lead'],
      default: 'Intermediate',
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function onSave(next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    skills: this.skills || ['JavaScript', 'React', 'Node.js'],
    preferredDomain: this.preferredDomain || 'Software Engineering',
    experienceLevel: this.experienceLevel || 'Intermediate',
    createdAt: this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);

export default User;
