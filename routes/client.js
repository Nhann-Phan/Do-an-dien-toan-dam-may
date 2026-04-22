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

// --- 2. TRANG CHUYÊN MỤC (PHÂN TRANG 7 BÀI/TRANG) ---
router.get('/category/:name', async (req, res) => {
    try {
        const categoryName = req.params.name;
        const page = parseInt(req.query.page) || 1; // Lấy trang hiện tại, mặc định là 1
        const limit = 6; // Chốt 7 bài một trang theo ý Nhân
        const skip = (page - 1) * limit;

        // Lấy bài viết thuộc category + Phân trang
        const articles = await Article.find({ category: categoryName })
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        // Tính toán tổng số trang
        const totalArticles = await Article.countDocuments({ category: categoryName });
        const totalPages = Math.ceil(totalArticles / limit);

        const cats = await Category.find();

        res.render('client/category-page', { 
            title: `Chuyên mục: ${categoryName}`, 
            articles, 
            categoryName,
            categories: cats,
            currentPage: page,
            totalPages
        });
    } catch (err) {
        res.status(500).send("Lỗi chuyên mục: " + err.message);
    }
});

// --- 3. TRANG CHI TIẾT BÀI VIẾT ---
router.get('/article/:id', async (req, res) => {
    try {
        const article = await Article.findByIdAndUpdate(
            req.params.id, 
            { $inc: { views: 1 } }, 
            { new: true }
        );

        if (!article) return res.status(404).send("Bài viết không tồn tại!");

        const comments = await Comment.find({ articleId: req.params.id }).sort({ createdAt: -1 });
        const cats = await Category.find(); 
        
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

// --- 4. GỬI BÌNH LUẬN ---
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

// --- 5. LIKE & DISLIKE ---
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

// --- 6. TÌM KIẾM ---
// routes/client.js

router.get('/search', async (req, res) => {
    try {
        const query = req.query.keyword; 
        if (!query) return res.redirect('/');

        const page = parseInt(req.query.page) || 1; // Lấy trang hiện tại
        const limit = 6; // Hiện 6 kết quả mỗi lần theo ý Nhân
        const skip = (page - 1) * limit;

        // Điều kiện tìm kiếm dùng chung cho cả việc lấy dữ liệu và đếm
        const searchFilter = {
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { summary: { $regex: query, $options: 'i' } }
            ]
        };

        // 1. Tìm bài viết có phân trang
        const articles = await Article.find(searchFilter)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        // 2. Đếm tổng số bài khớp để tính số trang
        const totalArticles = await Article.countDocuments(searchFilter);
        const totalPages = Math.ceil(totalArticles / limit);

        const cats = await Category.find();

        res.render('client/search-results', { 
            title: `Kết quả cho: ${query}`, 
            articles, 
            categories: cats, 
            query,
            currentPage: page,
            totalPages
        });
    } catch (err) {
        res.status(500).send("Lỗi tìm kiếm rồi Nhân: " + err.message);
    }
});

module.exports = router;