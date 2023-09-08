const express = require("express");
var bodyParser = require('body-parser');
const dotenv = require("dotenv");
const mercadopago = require("mercadopago");
const cors = require('cors');
const routes = require('./routes/usuarioRouter');
const port = process.env.PORT || 3000;



dotenv.config({ path: './.env' })

const app = express();
app.use(cors());

app.set('view engine', 'ejs')

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

app.use(express.static('public'));

// Rotas
app.use("/", routes);


app.listen(port, "0.0.0.0", function () {
    // ...
    console.log("servido Rodando")
});


