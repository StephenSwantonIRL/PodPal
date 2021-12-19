"use strict";

const express = require("express");
const router = express.Router();

const dashboard = require("./controllers/dashboard.js");
const about = require("./controllers/about.js");
const accounts = require("./controllers/accounts.js")
const device = require("./controllers/device.js")


router.get("/", accounts.index);
router.get("/login", accounts.login);
router.get("/signup", accounts.signup);
router.get("/logout", accounts.logout);
router.post("/register", accounts.register);
router.post("/authenticate", accounts.authenticate);

router.get("/", dashboard.index);
router.get("/dashboard", dashboard.index);
router.get("/home", dashboard.userDashBoard);
router.get("/about", about.index);

router.post("/dashboard/addDevice", dashboard.addDevice)
router.post("/dashboard/addemployee", dashboard.addEmployee)
router.get("/invite/:id/:key", accounts.employeeRegistration)
router.post("/register/:id/:key", accounts.employeeSave)

router.get("/device/:id", device.index);
router.get("/addBooking/:user/:device/:time", device.addBooking);
router.get("/cancelBooking/:user/:device/:time", device.cancelBooking);

module.exports = router;
