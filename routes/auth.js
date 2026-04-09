const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// 1. TRANG ĐĂNG KÝ (Chỉ dành cho Tác giả)
router.get('/register', (req, res) => res.render('auth/register', { title: 'Đăng ký Tác giả' }));

router.post('/register', async (req, res) => {
    try {
        const { fullName, username, password, address, phone } = req.body;
        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({
            fullName, username, password: hashedPassword, address, phone, role: 'author'
        });
        
        await newUser.save();
        res.redirect('/auth/login');
    } catch (err) {
        res.send("Lỗi đăng ký: " + err.message);
    }
});

// 2. TRANG ĐĂNG NHẬP
router.get('/login', (req, res) => {
    res.render('auth/login', { 
        title: 'Đăng nhập', 
        error: null
    });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });

        // Sử dụng biến bcrypt đã require ở trên luôn cho gọn
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user._id;
            req.session.userRole = user.role;
            req.session.userFullName = user.fullName;
            return res.redirect('/admin'); 
        }

        res.render('auth/login', { 
            title: 'Đăng nhập', 
            error: 'Sai tài khoản hoặc mật khẩu rồi mạy!',
            oldUsername: username // Trả lại username để nó khỏi mất công điền lại
        });
    } catch (err) {
        res.render('auth/login', { title: 'Đăng nhập', error: 'Lỗi hệ thống: ' + err.message });
    }
});

// 3. ĐĂNG XUẤT
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;