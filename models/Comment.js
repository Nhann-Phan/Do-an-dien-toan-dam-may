const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' },
    content: { type: String, required: true },
    authorName: { type: String },
    role: { type: String, default: 'guest' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', CommentSchema);