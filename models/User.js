const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    address: { type: String },
    phone: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['admin', 'author'], 
        default: 'author' 
    },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);