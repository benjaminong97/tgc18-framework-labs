const express = require('express');
const hbs = require('hbs')
const wax = require('wax-on')
require('dotenv').config()
const csrf = require('csurf')

const session = require('express-session');
const flash = require('connect-flash');
const FileStore = require('session-file-store')(session);
const app = express()

app.set('view engine', 'hbs');

app.use(express.static('public'))

wax.on(hbs.handlebars)
wax.setLayoutPath("./views/layouts")

app.use(express.urlencoded({
    extended: false

}))

app.use(csrf())
// share csrf with hbs files
app.use(function(req,res,next){
    res.locals.csrfToken = req.csrfToken();
    next();
})
app.use(function (err, req, res, next) {
    if (err && err.code == "EBADCSRFTOKEN") {
        req.flash('error_messages', 'The form has expired. Please try again');
        res.redirect('back');
    } else {
        next()
    }
});

// set up sessions
app.use(session({
    store: new FileStore(),
    secret: process.env.SESSION_SECRET_KEY,
    resave: false,
    saveUninitialized: true
}))

// Share the user data with hbs files
app.use(function(req,res,next){
    res.locals.user = req.session.user;
    next();
})




app.use(flash())

// Register Flash middleware
app.use(function (req, res, next) {
    res.locals.success_messages = req.flash("success_messages");
    res.locals.error_messages = req.flash("error_messages");
    next();
});

const landingRoutes = require('./routes/landing')
const productRoutes = require('./routes/products')
const userRoutes = require('./routes/users')
const cloudinaryRoutes = require('./routes/cloudinary.js')
const cartRoutes = require('./routes/shoppingCart')
const checkoutRoutes = require('./routes/checkout')

async function main() {
    app.use('/', landingRoutes)
    app.use('/products', productRoutes)
    app.use('/users', userRoutes)
    app.use('/cloudinary', cloudinaryRoutes)
    app.use('/cart', cartRoutes)
    app.use('/checkout', checkoutRoutes)
} main()

app.listen(3000, () => {
    console.log("server has started")
})