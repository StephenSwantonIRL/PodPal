"use strict";

const express = require("express");
const logger = require("./utils/logger");
const helpers = require("./utils/helpers.js")
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
require('dotenv').config()

const app = express();
app.use(cookieParser());
const exphbs = require("express-handlebars");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
app.use(fileUpload());
app.engine(
  ".hbs",
  exphbs({
    extname: ".hbs",
    defaultLayout: "main",
    helpers: {
      bookButton: (state,time, device, user, ownBookings) => helpers.bookButton(state,time, device, user, ownBookings)
    }
  })
);
app.set("view engine", ".hbs");

const routes = require("./routes");
app.use("/", routes);

const listener = app.listen(process.env.PORT || 4000, function() {
  logger.info(`glitch-template-1 started on port ${listener.address().port}`);
});
