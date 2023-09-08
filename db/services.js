const mongoose = require("mongoose");

const services = new mongoose.Schema({
    service_id:Number,
    service_names: String,
    service_description: String,
    service_price: Number,
    start_count: Number,
    url_client: String,
    category_service: String,
    client_id_service : String,
    id: Number,
    quantity_service: Number,
    payment_id: Number,
    status_service: String,
})

module.exports = services;