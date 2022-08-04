const express = require("express")
const router = express.Router()

router.get('/', (req,res) => {
    res.render("landing")
})

router.get('/itsame', (req,res) => {
    res.send("HAI")
})

router.get('/create', (req,res) => {
    res.send("create product")
})

module.exports = router