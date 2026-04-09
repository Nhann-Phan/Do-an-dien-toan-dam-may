const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const Category = require('../models/Category');
const User = require('../models/User');
const Comment = require('../models/Comment');
const uploadCloud = require('../config/cloudinary');
const bcrypt = require('bcryptjs');

// 1. MIDDLEWARE
const isLoggedIn = (req, res, next) => {
    if (req.session.userId) return next();
    res.redirect('/auth/login');
};

const isAdmin = (req, res, next) => {
    if (req.session.userRole === 'admin') return next();
    res.status(403).send("Chỉ Admin mới có quyền vào đây mạy!");
};

// ==========================================
// 2. QUẢN LÝ BÀI VIẾT
// ==========================================

// Danh sách bài viết (Admin thấy hết, Author thấy bài mình)
router.get('/', isLoggedIn, async (req, res) => {
    try {
        let query = {};
        if (req.session.userRole === 'author') query = { authorId: req.session.userId };
        const articles = await Article.find(query).sort({ created_at: -1 });
        res.render('admin/dashboard', { title: 'Bảng điều khiển', articles, page: 'dashboard' });
    } catch (err) { res.status(500).send(err.message); }
});

// Thêm bài mới
router.get('/add', isLoggedIn, async (req, res) => {
    const cats = await Category.find();
    res.render('admin/article/article-add', { title: 'Viết bài mới', cats, page: 'dashboard' });
});

router.post('/add', isLoggedIn, uploadCloud.single('image'), async (req, res) => {
    try {
        const { title, summary, content, category } = req.body;
        await new Article({ 
            title, summary, content, category, 
            image_url: req.file ? req.file.path : 'https://via.placeholder.com/300',
            author: req.session.userFullName,
            authorId: req.session.userId
        }).save();
        res.redirect('/admin');
    } catch (err) { res.send(err.message); }
});

// --- SỬA BÀI VIẾT (QUAN TRỌNG: Chỉ chủ bài mới được sửa) ---
router.get('/edit/:id', isLoggedIn, async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) return res.status(404).send("Bài không tồn tại");

        if (article.authorId.toString() !== req.session.userId) {
            return res.status(403).send("Không thể sửa!");
        }

        const cats = await Category.find();
        res.render('admin/article/article-edit', { 
            title: 'Sửa bài viết', 
            article, 
            cats, 
            page: 'dashboard' 
        });
    } catch (err) { res.status(500).send(err.message); }
});

router.post('/edit/:id', isLoggedIn, uploadCloud.single('image'), async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) return res.status(404).send("Bài không tồn tại");

        if (article.authorId.toString() !== req.session.userId) {
            return res.status(403).send("Đừng có hack mạy, bài này không phải của mày!");
        }

        const { title, summary, content, category } = req.body;
        let updateData = { title, summary, content, category };
        if (req.file) updateData.image_url = req.file.path;

        await Article.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/admin');
    } catch (err) { res.status(500).send(err.message); }
});

// Xóa bài viết (Admin được xóa hết, Author chỉ xóa bài mình)
router.get('/delete/:id', isLoggedIn, async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) return res.status(404).send("Bài không tồn tại");

        if (req.session.userRole !== 'admin' && article.authorId.toString() !== req.session.userId) {
            return res.status(403).send("Mày định xóa bài người khác hả Nhân?");
        }

        await Article.findByIdAndDelete(req.params.id);
        res.redirect('/admin');
    } catch (err) { res.send(err.message); }
});

// ==========================================
// 3. QUẢN LÝ BÌNH LUẬN (Phân quyền Author/Admin)
// ==========================================
router.get('/comments', isLoggedIn, async (req, res) => {
    try {
        let query = {};
        if (req.session.userRole === 'author') {
            const myArticles = await Article.find({ authorId: req.session.userId }).select('_id');
            const myIds = myArticles.map(a => a._id);
            query = { articleId: { $in: myIds } };
        }

        const comments = await Comment.find(query).populate('articleId').sort({ createdAt: -1 });
        res.render('admin/comment/comments', { title: 'Quản lý Bình luận', comments, page: 'comments' }); 
    } catch (err) { res.status(500).send(err.message); }
});

router.get('/comments/delete/:id', isLoggedIn, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id).populate('articleId');
        if (req.session.userRole === 'admin' || comment.articleId.authorId.toString() === req.session.userId) {
            await Comment.findByIdAndDelete(req.params.id);
            return res.redirect('/admin/comments');
        }
        res.status(403).send("Không thể xóa bình luận này!");
    } catch (err) { res.send(err.message); }
});

// ==========================================
// 4. HỒ SƠ & QUẢN TRỊ (Admin Only)
// ==========================================
router.get('/profile', isLoggedIn, async (req, res) => {
    const user = await User.findById(req.session.userId);
    res.render('admin/user/profile', { title: 'Hồ sơ của tôi', user, page: 'profile' });
});

router.post('/profile/update', isLoggedIn, async (req, res) => {
    try {
        // 1. Lấy dữ liệu từ form
        const { currentPassword, fullName, address, phone, newPassword } = req.body;

        // 2. Tìm thằng user đang thực hiện thao tác
        const user = await User.findById(req.session.userId);

        // 3. KIỂM TRA MẬT KHẨU CŨ
        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            // Nếu sai mật khẩu cũ thì không cho làm gì hết, báo lỗi ngay
            return res.send("<script>alert('Mật khẩu cũ không đúng.'); window.location='/admin/profile';</script>");
        }

        // 4. NẾU ĐÚNG MẬT KHẨU: Chuẩn bị data để update
        let updateData = { fullName, address, phone };
        // 5. Nếu có nhập mật khẩu mới thì mới hash và thêm vào updateData
        if (newPassword && newPassword.trim() !== "") {
            updateData.password = await bcrypt.hash(newPassword, 10);
        }
        // 6. Cập nhật vào Database
        await User.findByIdAndUpdate(req.session.userId, updateData);

        req.session.userFullName = fullName;

        res.redirect('/admin/profile?success=true');
    } catch (err) { 
        res.status(500).send("Lỗi hệ thống: " + err.message); 
    }
});

router.get('/categories', isLoggedIn, isAdmin, async (req, res) => {
    const cats = await Category.find();
    res.render('admin/categories/categories', { title: 'Quản lý Danh mục', cats, page: 'categories' });
});

router.get('/users', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const users = await User.find().sort({ created_at: -1 });
        res.render('admin/user/users', { title: 'Quản lý Người dùng', users, page: 'users' }); 
    } catch (err) { res.status(500).send(err.message); }
});

router.get('/users/delete/:id', isLoggedIn, isAdmin, async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/admin/users');
});

module.exports = router;