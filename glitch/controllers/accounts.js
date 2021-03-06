"use strict";


const logger = require("../utils/logger");
const uuid = require("uuid");
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
// register admin users on the platform
  async register(request, response) {
    const user = request.body;
    const pushAlertUUID = "name="+uuid.v1().replace(/-/g, "");
    const userpw = CryptoJS.MD5(user.password)
    // create the Push Alert segment for that admin user using an axios request
    const pushAlert = `https://api.pushalert.co/rest/v1/segment/create`
    const pushAlertKey = "api_key="+process.env.pushalertAPI
    const result = await axios.post(pushAlert, pushAlertUUID, {headers:{ 'Authorization': pushAlertKey}})  .then(function (response) {
      return response.data.id;
    })
      .catch(function (error) {
      });
    // then insert the admin users info into the db.
    const admin = await sql` insert into admin (fName, lName, email, password, pushAlertId ) values (${user.firstname}, ${user.lastname},${user.email},${userpw},${result})`
    console.log(admin)

    logger.info(`registering ${user.email}`);
    response.redirect("/");
  },
// check if an attempted sign in is valid
  async authenticate(request, response) {
    const userToAuthenticate = request.body;
    const userpw = CryptoJS.MD5(userToAuthenticate.password).toString()
    // have to check both admin and employee tables for the user attempting to sign in
   const checkIfRegistered = await sql`with C as ( select email, password, 'admin' as role from admin where email = ${userToAuthenticate.email} AND password=${userpw}  )  SELECT * FROM C 
UNION ALL select email, password, 'employee' as role from employee where email = ${userToAuthenticate.email} AND password=${userpw} AND NOT EXISTS (SELECT * FROM C);`
    // redirect depending on whether admin or end user
    if(checkIfRegistered['count']==1 && checkIfRegistered[0].role=='admin'){
      response.cookie("podpal", userToAuthenticate.email);
      response.redirect("/dashboard");
    } else if(checkIfRegistered['count']==1 && checkIfRegistered[0].role=='employee'){
      response.cookie("podpal", userToAuthenticate.email);
      response.redirect("/home");
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
  },

  async employeeRegistration(request, response) {
    //get the user and key from the route
    const user = request.params.id;
    const keyAssigned = CryptoJS.MD5(user).toString()
    const keyPresented = request.params.key;
    // if user exists && presents correct key render the form
    const currentUser = await sql` select * from employee where id =${user} `.catch()
    if (currentUser['count'] == 1 && keyAssigned === keyPresented && currentUser[0].password ==null) {
      //render the form
      const viewData = {
        title: "Login to the Service",
        userId: user,
        key: keyPresented,
        email: currentUser[0].email
      };
      console.log(viewData)
      response.render("employeeSignup", viewData);
    } else {
      // if not correct render a page informing the end user
      response.render("invite404");
    }
  },

// function to remove an end user from the admins workspace
  async revokeEmployee(request, response) {
    //get the user and key from the route
    const user = request.params.id;
    const admin = request.params.adminid;
    // if user exists && presents correct key render the form
    const currentUser = await sql` delete from employee where id =${user} and accountadmin=${admin}`.catch()
    response.redirect("/dashboard");

  },

  // saves the additional information provided by the end user to the db to enable them to use the system
  async employeeSave(request, response) {
    //get the user and key from the route
    const user = request.params.id;
    const newData = request.body
    const keyAssigned = CryptoJS.MD5(user).toString()
    const keyPresented = request.params.key;
    // to prevent abuse check if user exists && presents correct key to render the form
    const currentUser = await sql` select * from employee where id =${user} `.catch()
    if (currentUser['count'] == 1 && keyAssigned === keyPresented) {
      const hashedPassword = CryptoJS.MD5(newData.password).toString()
      const updatedUser = await sql` update employee set fName=${newData.firstname}, lName=${newData.lastname}, password=${hashedPassword} where id =${user}`
      console.log(` update employee set fName=${newData.firstname}, lName=${newData.lastname}, password=${hashedPassword} where id =${user}`)
      const viewData = {
        title: "Login to the Service",
        userId: user,
        key: keyPresented,
        email: currentUser[0].email
      };
      console.log(viewData)
      response.render("employeeSignup", viewData);
    } else {
      response.render("invite404");
    }
  }

  }



module.exports = accounts;
