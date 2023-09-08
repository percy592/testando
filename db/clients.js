const mongoose = require("mongoose");

const clients = new mongoose.Schema({
    email: String,
    telefone: String,
    client_id: String,
    date_created:  Date,
    date_login: Date,
    ip: String
})

module.exports = clients;