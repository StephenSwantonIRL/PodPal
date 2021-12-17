

const helpers = {
bookButton(state,time, device, user){
  if(state==true){
    return '<a class="ui tiny button">Unavailable</a>'
  } else {
    return `<a href="/addBooking/${user}/${device}/${time}" class="ui tiny button green">Book</a>`
  }
},

}

module.exports = helpers
