const mongoose = require("mongoose");


const payments = new mongoose.Schema({
    payment_id:Number,
    payment_amount: Number,
    payment_privateCode: String,
    payment_ip: String,
    client_id_payments: String,
    date_created: String,
    payment_method_id: String,
    status_payments: String,
    status_detail: String,
    description_payments: String,
    long_name: String,
    payer_account_id: Number,
    transaction_id: String
})

module.exports = payments;