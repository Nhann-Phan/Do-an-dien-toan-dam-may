const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const Category = require('../models/Category');
const Comment = require('../models/Comment');

// --- 1. TRANG CHỦ ---
router.get('/', async (req, res) => {
    try {
        const cats = await Category.find();
        const allArticles = await Article.find().sort({ created_at: -1 });

        // Phân loại cho Menu (Xu hướng, Nổi bật, Đề xuất)
        const trending = await Article.find().sort({ views: -1 }).limit(5);
        const featured = await Article.find().sort({ likes: -1 }).limit(5);
        const recommended = await Article.find().sort({ created_at: -1 }).limit(5);

        const latestArticles = allArticles.slice(0, 5);
        const topArticle = allArticles.length > 0 ? allArticles[0] : null;

        const sections = cats.map(cat => ({
            name: cat.name,
            icon: cat.icon,
            list: allArticles.filter(a => a.category === cat.name).slice(0, 4)
        }));

        res.render('client/index', { 
            sections, topArticle, latestArticles, categories: cats,
            trending, featured, recommended 
        });
    } catch (err) {
        res.status(500).send("Lỗi hệ thống: " + err.message);
    }
});

// --- 2. TRANG CHI TIẾT BÀI VIẾT ---
router.get('/article/:id', async (req, res) => {
    try {
        // Tăng views và lấy bài viết
        const article = await Article.findByIdAndUpdate(
            req.params.id, 
            { $inc: { views: 1 } }, 
            { new: true }
        );

        if (!article) return res.status(404).send("Bài viết không tồn tại!");

        // Lấy bình luận (Fix lỗi bài này không hiện cmt)
        const comments = await Comment.find({ articleId: req.params.id }).sort({ createdAt: -1 });

        const cats = await Category.find(); 
        
        // Lấy tin mới (Fix lỗi ReferenceError: latestArticles is not defined)
        const latestArticles = await Article.find({ _id: { $ne: article._id } })
                                            .sort({ created_at: -1 })
                                            .limit(5);

        res.render('client/detail', { 
            article, latestArticles, categories: cats, comments 
        });

    } catch (err) {
        res.status(500).send("Lỗi trang chi tiết: " + err.message);
    }
});

// --- 3. GỬI BÌNH LUẬN ---
router.post('/article/:id/comment', async (req, res) => {
    try {
        const { content } = req.body;
        const articleId = req.params.id;

        let authorName = "Khách vãng lai";
        let authorRole = "guest";

        if (req.session && req.session.userId) {
            authorName = req.session.userFullName;
            authorRole = req.session.userRole;
        }

        const newComment = new Comment({ articleId, content, authorName, authorRole });
        await newComment.save();
        await Article.findByIdAndUpdate(articleId, { $inc: { comments_count: 1 } });

        res.redirect('/article/' + articleId); 
    } catch (err) {
        res.status(500).send("Lỗi bình luận: " + err.message);
    }
});

// --- 4. LIKE & DISLIKE VẠN NĂNG (Bật/Tắt/Chuyển đổi) ---
router.post('/article/:id/vote', async (req, res) => {
    try {
        const { likeDelta, dislikeDelta } = req.body;
        const article = await Article.findByIdAndUpdate(
            req.params.id,
            { $inc: { likes: likeDelta || 0, dislikes: dislikeDelta || 0 } },
            { new: true }
        );
        res.json({ success: true, likes: article.likes, dislikes: article.dislikes });
    } catch (err) {
        res.json({ success: false });
    }
});

// routes/index.js (hoặc file route trang chủ của mày)
router.get('/search', async (req, res) => {
    try {
        const query = req.query.keyword; // Lấy chữ cái mày gõ từ ô input
        if (!query) return res.redirect('/');

        // Tìm trong Database: Tiêu đề hoặc Tóm tắt có chứa chữ đó
        const articles = await Article.find({
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { summary: { $regex: query, $options: 'i' } }
            ]
        }).sort({ created_at: -1 });

        // Lấy thêm danh mục để hiện trên menu (nếu cần)
        const cats = await Category.find();

        // Render ra trang kết quả
        res.render('client/search-results', { 
            title: `Kết quả cho: ${query}`, 
            articles, 
            cats, 
            query 
        });
    } catch (err) {
        res.send("Lỗi rồi Nhân ơi: " + err.message);
    }
});

module.exports = router;