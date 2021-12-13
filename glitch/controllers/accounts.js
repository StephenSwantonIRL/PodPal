"use strict";


const logger = require("../utils/logger");
const uuid = require("uuid");
const postgres = require('postgres')
const axios = require('axios');
const CryptoJS = require("crypto-js")
const sql = require('../db.js')

const accounts = {
  index(request, response) {
    const viewData = {
      title: "Login or Signup"
    };
    response.render("index", viewData);
  },

  login(request, response) {
    const viewData = {
      title: "Login to the Service"
    };
    response.render("login", viewData);
  },

  logout(request, response) {
    response.cookie("podpal", "");
    response.redirect("/");
  },

  signup(request, response) {
    const viewData = {
      title: "Login to the Service"
    };
    response.render("signup", viewData);
  },

  async register(request, response) {
    const user = request.body;
    const pushAlertUUID = "name="+uuid.v1().replace(/-/g, "");
    const userpw = CryptoJS.MD5(user.password)
    const pushAlert = `https://api.pushalert.co/rest/v1/segment/create`
    const pushAlertKey = "api_key="+process.env.pushalertAPI
    const result = await axios.post(pushAlert, pushAlertUUID, {headers:{ 'Authorization': pushAlertKey}})  .then(function (response) {
      return response.data.id;
    })
      .catch(function (error) {
      });
    const admin = await sql` insert into admin (fName, lName, email, password, pushAlertId ) values (${user.firstname}, ${user.lastname},${user.email},${userpw},${result})`
    console.log(admin)

    logger.info(`registering ${user.email}`);
    response.redirect("/");
  },

  async authenticate(request, response) {
    const userToAuthenticate = request.body;
    const userpw = CryptoJS.MD5(userToAuthenticate.password).toString()

    const checkIfRegistered = await sql` select * from admin where email =${userToAuthenticate.email} AND password=${userpw}`
    if(checkIfRegistered['count']==1){
      response.cookie("podpal", userToAuthenticate.email);
      response.redirect("/dashboard");
    }
    else  {
      const viewData = {
        title: "Login to the Service",
        notify: "Incorrect Username or Password. Please try again."
      };
        response.render("login", viewData);
      }

    },

  async getCurrentUser(email) {
    const userEmail = email.toString();
    console.log(email)
    const currentUser = await sql` select * from admin where email ='${userEmail}' `
    console.log("Count:" + currentUser['count'])
    return currentUser[0];
  }
  }



module.exports = accounts;
