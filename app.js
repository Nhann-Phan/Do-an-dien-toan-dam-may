require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const app = express();

// 1. KẾT NỐI DATABASE (Lấy từ .env)
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected.'))
    .catch(err => console.error('Lỗi kết nối DB:', err));

// 2. CẤU HÌNH CƠ BẢN
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. CẤU HÌNH SESSION (Lấy SECRET từ .env)
app.use(session({
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } 
}));

// 4. MIDDLEWARE TRUYỀN BIẾN USER
app.use((req, res, next) => {
    res.locals.user = (req.session && req.session.userId) ? {
        id: req.session.userId,
        role: req.session.userRole,
        fullName: req.session.userFullName
    } : null;
    next();
});

// 5. SỬ DỤNG ROUTE
app.use('/', require('./routes/client'));
app.use('/admin', require('./routes/admin'));
app.use('/auth', require('./routes/auth'));

// 6. CHẠY SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Web chạy tại: http://localhost:${PORT}`);
});