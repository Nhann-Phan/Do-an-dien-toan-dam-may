const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
    title: String,
    summary: String,
    content: String,
    category: String,
    image_url: String,
  
    author: { type: String, default: 'Admin' }, 
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // Các chỉ số để phân loại Menu
    views: { type: Number, default: 0 },         
    likes: { type: Number, default: 0 },          
    dislikes: { type: Number, default: 0 },
    comments_count: { type: Number, default: 0 },
    
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Article', articleSchema);