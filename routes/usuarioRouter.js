const express = require("express");
const router = express.Router();
const axios = require("axios");
const mongoose = require("mongoose");
const clients = require("../db/clients");
const payments = require("../db/payments");
const services = require("../db/services");
const gratis = require("../db/gratis")
const mercadopago = require("mercadopago");
const jwt = require("jsonwebtoken");

mongoose.connect(
  "mongodb+srv://painelSmm:A3hYqWJ7QSv50yDN@painelsmm.n78wpsm.mongodb.net/?retryWrites=true&w=majority"
);

const Clients = mongoose.model("Clients", clients);
const Services = mongoose.model("Services", services);
const Payments = mongoose.model("Payments", payments);
const Gratis = mongoose.model("Gratis", gratis);

// Rota pública
router.get("/", (req, res) => {
  res.render("index");
});

// Rota Service
router.get("/termos", (req, res) => {
  res.render("termos");
});

router.get("/politica", (req, res) => {
  res.render("politica");
});

router.get("/gratis", (req, res) => {
  res.render("gratis");
});

router.post('/gratis', (req, res) => {
  let { link } = req.body;

  if (link !== "" && link !== undefined && link !== null) {
    const query = { link: link }; // Por exemplo, procurar pelo email 'exemplo@example.com'

    Gratis.findOne(query)
      .then((userLink) => {
        if (!userLink) {
          const linkSave = new Gratis({
            link: link
          });

          linkSave.save()
            .then((resp) => {
              if (resp.id) {
                const api_url = "https://measmm.com/api/v2";

                const requestData = {
                  key: process.env.KEY,
                  action: "add",
                  service: 1226,
                  link: link,
                  quantity: 20,
                  interval: 5,
                };

                const serviceClient = async () => {
                  try {
                    const responseMea = await axios.post(
                      api_url,
                      requestData,
                      {
                        headers: {
                          "content-type": "application/json",
                          key: process.env.KEY,
                        },
                      }
                    );
                  } catch (err) {

                  }
                }

                serviceClient();
                res.redirect('/')

              }
            })

        } else {

          res.redirect('/')

        }
      })
  }
})

router.get("/pedido", (req, res) => {
  res.render("pedido");
});

router.post("/pedido", (req, res) => {
  const { email, token } = req.body;

  const queryEmail = { email: email };
  let clientID;

  if (email !== undefined && email !== null) {
    Clients.findOne(queryEmail)
      .then((client) => {
        if (client !== null) {
          clientID = { client_id_service: client.id };
          Services.find(clientID).then((resp) => {

            for (let i = 0; i < resp.length; i++) {
              const serviceClient = async () => {
                try {
                  const api_url = "https://measmm.com/api/v2";

                  const requestData = {
                    key: process.env.KEY,
                    action: "status",
                    order: resp[i].service_id,
                  };

                  const responseMea = await axios.post(api_url, requestData, {
                    headers: {
                      "content-type": "application/json",
                      key: process.env.KEY,
                    },
                  });

                  if (responseMea.data.status !== undefined) {
                    Services.updateMany(
                      { service_id: resp[i].service_id },
                      {
                        $set: {
                          start_count: responseMea.data.start_count,
                          status_service: responseMea.data.status,
                        },
                      }
                    );
                  }
                } catch (err) {

                }
              };
              if (i >= resp.length - 1) {
                Services.find(
                  clientID,
                  "service_id service_description start_count status_service quantity_service service_price"
                ).then((resp) => {
                  var token = jwt.sign({ token: email }, process.env.CHAVE);
                  res.status(200).json({ response: resp, token: token });
                });
              }
              serviceClient();
            }

          });
        } else {
          //console.log("Usuario não encontrado");
        }
      })
      .catch((err) => {
        console.log(err);
      });
  } else if (token !== "" && token !== null && token !== undefined) {
    let novaString = token.split('"').join("");
    jwt.verify(novaString, process.env.CHAVE, function (err, decoded) {
      if (decoded !== undefined) {
        const queryToken = { email: decoded.token };

        Clients.findOne(queryToken)
          .then((client) => {
            if (client !== null) {
              clientID = { client_id_service: client.id };
              Services.find(clientID)
                .then((resp) => {
                  for (let i = 0; i < resp.length; i++) {
                    const serviceClient = async () => {
                      try {
                        const api_url = "https://measmm.com/api/v2";

                        const requestData = {
                          key: process.env.KEY,
                          action: "status",
                          order: resp[i].service_id,
                        };

                        const responseMea = await axios.post(
                          api_url,
                          requestData,
                          {
                            headers: {
                              "content-type": "application/json",
                              key: process.env.KEY,
                            },
                          }
                        );

                        if (responseMea.data.status !== undefined) {
                          Services.updateMany(
                            { service_id: resp[i].service_id },
                            {
                              $set: {
                                start_count: responseMea.data.start_count,
                                status_service: responseMea.data.status,
                              },
                            }
                          )
                            .then((resp) => {
                              //console.log(resp)
                            })
                        }
                      } catch (err) {
                        //console.log("err");
                      }
                    };

                    if (i >= resp.length - 1) {
                      Services.find(
                        clientID,
                        "service_id service_description start_count status_service quantity_service service_price"
                      ).then((resp) => {
                        res.status(200).json({ response: resp });
                      });
                    }
                    serviceClient();
                  }

                });
            } else {
              console.log("Usuario não encontrado");
            }
          })
          .catch((err) => {

          });
      }
    });
  }
});

// Checkout
router.get("/checkout", (req, res) => {
  let token;
  let copy;
  res.render("checkout", { token: token, copy: copy });
});

router.post("/checkout", (req, res) => {
  const { email, telefone, link, serviceId } = req.body;

  let converte = JSON.parse(serviceId);
  let converteQntd = parseInt(converte[0].qntdService);
  let converteId = Number(converte[0].id);
  let descriptionService = "";
  let total = 0;
  let idService;

  if (converteId === 0) {
    switch (converteQntd) {
      case 100:
        total = 2.00;
        break;
      case 150:
        total = 2.50;
        break;
      case 300:
        total = 3.00
        break;
      case 500:
        total = 3.99;
        break;
      case 1000:
        total = 5.97;
        break;
      case 2000:
        total = 10.99;
        break;
      case 3000:
        total = 15.97;
        break;
      case 5000:
        total = 24.99;
        break;
    }

    idService = 858;
    descriptionService = "Curtidas Mundiais Instagram [Rápido] [5-10K/Hora]"
  } else if (converteId === 1) {
    switch (converteQntd) {
      case 50:
        total = 1.50;
        break;
      case 100:
        total = 2.00;
        break;
      case 150:
        total = 3.00;
        break;
      case 300:
        total = 3.50;
        break;
      case 500:
        total = 4.00;
        break;
      case 1000:
        total = 6.97;
        break;
      case 2000:
        total = 11.97;
        break;
      case 3000:
        total = 18.99;
        break;
      case 5000:
        total = 29.97;
        break;
      case 10000:
        total = 55.97;
        break;
      case 15000:
        total = 83.99;
        break;
      case 20000:
        total = 105.99;
        break;
    }

    idService = 4200;
    descriptionService = "Seguidores Instagram [5-10K/HORA] [RÁPIDO] [R365/Dias]";
  } else if (converteId === 2) {
    switch (converteQntd) {
      case 50:
        total = 3.99;
        break;
      case 100:
        total = 5.97;
        break;
      case 150:
        total = 7.50;
        break;
      case 300:
        total = 10.00;
        break;
      case 500:
        total = 15.00;
        break;
      case 1000:
        total = 23.99;
        break;
      case 2000:
        total = 45.97;
        break;
      case 3000:
        total = 65.00;
        break;
      case 5000:
        total = 99.99;
        break;
      case 10000:
        total = 195.97;
        break;
      case 15000:
        total = 270.97;
        break;
      case 20000:
        total = 370.99;
        break;
    }

    idService = 1755;
    descriptionService = "Seguidores Brasileiros [Rápido] [R30/Dias]"
  } else if (converteId === 3) {
    switch (converteQntd) {
      case 100:
        total = 3.00;
        break;
      case 150:
        total = 3.50;
        break;
      case 300:
        total = 4.99;
        break;
      case 500:
        total = 7.97;
        break;
      case 1000:
        total = 9.97;
        break;
      case 2000:
        total = 16.99;
        break;
      case 3000:
        total = 24.00;
        break;
      case 5000:
        total = 35.97;
        break;
    }

    idService = 1231;
    descriptionService = "Curtidas Instagram Brasileiras [Rápido] [R30/Dias]"
  }else if (converteId === 4) {
    switch (converteQntd) {
      case 50:
        total = 2.99;
        break;
      case 100:
        total = 4.97;
        break;
      case 150:
        total = 7.00;
        break;
      case 300:
        total = 9.97;
        break;
      case 500:
        total = 14.97;
        break;
      case 1000:
        total = 19.00;
        break;
      case 2000:
        total = 35.99;
        break;
      case 3000:
        total = 55.00;
        break;
      case 5000:
        total = 88.97;
        break;
      case 10000:
        total = 160.99;
        break;
      case 15000:
        total = 242.97;
        break;
      case 20000:
        total = 310.00;
        break;
    }

    idService = 1727;
    descriptionService = "Seguidores Brasileiros Mulheres [Rápido] [Qualidade]"
  }else if (converteId === 5) {
    switch (converteQntd) {
      case 50:
        total = 2.99;
        break;
      case 100:
        total = 4.97;
        break;
      case 150:
        total = 7.00;
        break;
      case 300:
        total = 9.97;
        break;
      case 500:
        total = 14.97;
        break;
      case 1000:
        total = 19.00;
        break;
      case 2000:
        total = 35.99;
        break;
      case 3000:
        total = 55.00;
        break;
      case 5000:
        total = 88.97;
        break;
      case 10000:
        total = 160.99;
        break;
      case 15000:
        total = 242.97;
        break;
      case 20000:
        total = 310.00;
        break;
    }

    idService = 537;
    descriptionService = "Seguidores Brasileiros Homens [Rápido] [Qualidade]"
  }

  let valorTotal = Number(total.toFixed(2))

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const regexTelefone = /^\+?[1-9]\d{1,14}$/;
  const query = { email: email }; // Por exemplo, procurar pelo email 'exemplo@example.com'

  if (email !== "" && email !== null && email !== undefined) {
    if (telefone !== "" && telefone !== null && telefone !== undefined) {
      if (link !== "" && link !== null && link !== undefined) {
        if (regex.test(email)) {
          if (regexTelefone.test(telefone)) {
            if (converteQntd >= 50 || converteQntd >= "50") {
              if (valorTotal >= 1 && valorTotal !== undefined && valorTotal !== null) {
                if (converteQntd !== 0 && converteQntd !== undefined && converteQntd !== null) {
                  Clients.findOne(query)
                    .then((client) => {
                      if (client == null) {
                        try {
                          const CreateUser = new Clients({
                            email: email,
                            telefone: telefone,
                            data_register: new Date(),
                            date_login: new Date(),
                            ip: "000.000.0.0",
                          });

                          CreateUser.save()
                            .then((client) => {
                              if (client.id !== null) {
                                mercadopago.configurations.setAccessToken(
                                  process.env.MERCADOPAGO
                                );
                                let payment_data = {
                                  transaction_amount: valorTotal,
                                  description: "Mídia Sociais",
                                  payment_method_id: "pix",
                                  payer: {
                                    email: "regina@gmail.com",
                                    first_name: "Regina",
                                    last_name: "Pedroso da silva",
                                    identification: {
                                      type: "CPF",
                                      number: "40470820829",
                                    },
                                    address: {
                                      zip_code: "06233200",
                                      street_name: "Av. das Nações Unidas",
                                      street_number: "3003",
                                      neighborhood: "Bonfim",
                                      city: "Osasco",
                                      federal_unit: "SP",
                                    },
                                  },
                                };

                                mercadopago.payment
                                  .create(payment_data)
                                  .then(function (data) {
                                    const paymentsCreated = new Payments({
                                      payment_id: data.response.id,
                                      payment_amount: data.response.transaction_amount,
                                      payment_privateCode: data.response.point_of_interaction.transaction_data.qr_code,
                                      payment_ip: "000.000.0.0",
                                      client_id_payments: client.id,
                                      date_created: data.response.date_created,
                                      payment_method_id:
                                        data.response.payment_method_id,
                                      status_payments: data.response.status,
                                      status_detail: data.response.status_detail,
                                      description_payments: data.response.description,
                                      long_name: "",
                                      payer_account_id: "",
                                      transaction_id: "",
                                    });

                                    paymentsCreated
                                      .save()
                                      .then((client) => {
                                        if (client !== null) {
                                          res.render("checkout", {
                                            token: data.response.point_of_interaction.transaction_data.qr_code_base64,
                                            copy: data.response.point_of_interaction.transaction_data.qr_code,
                                          });

                                          let tempo = 0;
                                          let intervalo = setInterval(() => {
                                            async function requestMercado() {
                                              try {
                                                const response = await axios.get(
                                                  `https://api.mercadopago.com/v1/payments/${data.response.id}`,
                                                  {
                                                    headers: {
                                                      "content-type": "application/json",
                                                      Authorization: process.env.MERCADOPAGOBER,
                                                    },
                                                  }
                                                );

                                                if (response.data.status === "approved" || response.data.status === "Approved") {
                                                  Payments.updateMany(
                                                    { payment_id: data.response.id },
                                                    {
                                                      $set: {
                                                        status_payments: response.data.status, status_detail: response.data.status_detail,
                                                        transaction_id: response.data.transaction_details.transaction_id,
                                                      },
                                                    }
                                                  )
                                                    .then((result) => {
                                                      const api_url =
                                                        "https://measmm.com/api/v2";

                                                      const requestData = {
                                                        key: process.env.KEY,
                                                        action: "add",
                                                        service: idService,
                                                        link: link,
                                                        quantity: converteQntd,
                                                        interval: 5,
                                                      };

                                                      const serviceClient =
                                                        async () => {
                                                          try {
                                                            const responseMea = await axios.post(
                                                              api_url,
                                                              requestData,
                                                              {
                                                                headers: {
                                                                  "content-type": "application/json",
                                                                  key: process.env.KEY,
                                                                },
                                                              }
                                                            );

                                                            if (responseMea.data.order !== "undefined" && responseMea.data.order !== undefined) {
                                                              const cretedService = new Services({
                                                                service_id: responseMea.data.order,
                                                                service_name: converte[0].description,
                                                                service_description: descriptionService,
                                                                service_price: totalAmount,
                                                                start_count: 0,
                                                                url_client: link,
                                                                category_service: converte[0].description,
                                                                client_id_service:
                                                                  client.client_id_payments,
                                                                quantity_service: converteQntd,
                                                                payment_id:
                                                                  data.response.id,
                                                                status_service: "Pendente",
                                                              });

                                                              cretedService
                                                                .save()
                                                                .then((resp) => {
                                                                  //console.log(
                                                                  // "Registrado com sucesso"
                                                                  //);
                                                                })
                                                                .catch((err) => {
                                                                  //console.log(err);
                                                                });
                                                            } else {
                                                              const cretedService = new Services({
                                                                service_id: responseMea.data.order,
                                                                service_name: "Error",
                                                                service_description: "Erro no Serviço - Link Duplicado",
                                                                service_price: totalAmount,
                                                                start_count: 0,
                                                                url_client: link,
                                                                category_service: "Seguidores",
                                                                client_id_service:
                                                                  client.client_id_payments,
                                                                quantity_service: converteQntd,
                                                                payment_id:
                                                                  data.response.id,
                                                                status_service: "Error",
                                                              });

                                                              cretedService
                                                                .save()
                                                                .then((resp) => {
                                                                  //console.log("Registrado Erro com sucesso");
                                                                })
                                                                .catch((err) => {
                                                                  console.log(err);
                                                                });
                                                            }
                                                          } catch (err) {
                                                            serviceClient();
                                                          }
                                                        };

                                                      serviceClient();
                                                      clearInterval(intervalo);
                                                    })
                                                    .catch((error) => {
                                                      console.error("Erro ao atualizar os documentos:", error);
                                                    });
                                                } else {
                                                  tempo++;
                                                  if (tempo >= 60) {
                                                    clearInterval(intervalo);
                                                    tempo = 0;
                                                  }
                                                }
                                              } catch (err) {
                                                requestMercado();
                                              }
                                            }

                                            requestMercado();
                                          }, 5000);
                                        }
                                      })
                                      .catch((err) => {
                                        console.log("Erro ao obter o cliente:", err);
                                      });
                                  });
                              }
                            })
                            .catch((err) => {
                              console.log("Erro ao adicionar o cliente:", err);
                            });

                          if (error) {
                            res.status(500).json();
                          }
                        } catch (error) {
                          res.status(500);
                        }
                      } else {
                        mercadopago.configurations.setAccessToken(
                          process.env.MERCADOPAGO
                        );

                        let payment_data = {
                          transaction_amount: valorTotal,
                          description: "Mídia Sociais",
                          payment_method_id: "pix",
                          payer: {
                            email: "regina@gmail.com",
                            first_name: "Regina",
                            last_name: "Pedroso da silva",
                            identification: {
                              type: "CPF",
                              number: "40470820829",
                            },
                            address: {
                              zip_code: "06233200",
                              street_name: "Av. das Nações Unidas",
                              street_number: "3003",
                              neighborhood: "Bonfim",
                              city: "Osasco",
                              federal_unit: "SP",
                            },
                          },
                        };

                        mercadopago.payment
                          .create(payment_data)
                          .then(function (data) {
                            const paymentsCreated = new Payments({
                              payment_id: data.response.id,
                              payment_amount: data.response.transaction_amount,
                              payment_privateCode:
                                data.response.point_of_interaction.transaction_data.qr_code,
                              payment_ip: "000.000.0.0",
                              client_id_payments: client.id,
                              date_created: data.response.date_created,
                              payment_method_id: data.response.payment_method_id,
                              status_payments: data.response.status,
                              status_detail: data.response.status_detail,
                              description_payments: data.response.description,
                              long_name: "",
                              payer_account_id: "",
                              transaction_id: "",
                            });

                            paymentsCreated
                              .save()
                              .then((client) => {
                                if (client !== null) {
                                  res.render("checkout", {
                                    token: data.response.point_of_interaction.transaction_data.qr_code_base64,
                                    copy: data.response.point_of_interaction.transaction_data.qr_code,
                                  });
                                  let tempo = 0;
                                  let intervalo = setInterval(() => {

                                    async function requestMercado() {
                                      try {
                                        const response = await axios.get(
                                          `https://api.mercadopago.com/v1/payments/${data.response.id}`,
                                          {
                                            headers: {
                                              "content-type": "application/json",
                                              Authorization: process.env.MERCADOPAGOBER,
                                            },
                                          }
                                        );
                                        if (response.data.status === "approved" || response.data.status === "Approved") {
                                          Payments.updateMany(
                                            { payment_id: data.response.id },
                                            {
                                              $set: {
                                                status_payments: response.data.status,
                                                status_detail: response.data.status_detail, transaction_id: response.data.transaction_details.transaction_id,
                                              },
                                            }
                                          )
                                            .then((result) => {
                                              const api_url =
                                                "https://measmm.com/api/v2";

                                              const requestData = {
                                                key: process.env.KEY,
                                                action: "add",
                                                service: idService,
                                                link: link,
                                                quantity: converteQntd,
                                                interval: 5,
                                              };

                                              const serviceClient = async () => {
                                                try {
                                                  const responseMea =
                                                    await axios.post(
                                                      api_url,
                                                      requestData,
                                                      {
                                                        headers: {
                                                          "content-type": "application/json",
                                                          key: process.env.KEY,
                                                        },
                                                      }
                                                    );

                                                  if (responseMea.data.order !== "undefined" && responseMea.data.order !== undefined) {
                                                    const cretedService = new Services({
                                                      service_id: responseMea.data.order,
                                                      service_name: converte[0].description,
                                                      service_description: descriptionService,
                                                      service_price: totalAmount,
                                                      start_count: 0,
                                                      url_client: link,
                                                      category_service: converte[0].description,
                                                      client_id_service:
                                                        client.client_id_payments,
                                                      quantity_service: converteQntd,
                                                      payment_id: data.response.id,
                                                      status_service: "Pendente",
                                                    });

                                                    cretedService.save()
                                                      .then((resp) => {
                                                        //console.log("Serviço registrado com sucesso " + resp)
                                                      })
                                                      .catch((err) => {
                                                        console.log(err);
                                                      });
                                                  } else {
                                                    const cretedService = new Services({
                                                      service_id: responseMea.data.order,
                                                      service_name: "Error",
                                                      service_description: "Erro no Serviço - Link Duplicado",
                                                      service_price: totalAmount,
                                                      start_count: 0,
                                                      url_client: link,
                                                      category_service: "Seguidores",
                                                      client_id_service:
                                                        client.client_id_payments,
                                                      quantity_service: converteQntd,
                                                      payment_id: data.response.id,
                                                      status_service: "Error",
                                                    });

                                                    cretedService
                                                      .save()
                                                      .then((resp) => {
                                                        //console.log("Serviço registrado " + resp);
                                                      })
                                                      .catch((err) => {
                                                        console.log(err);
                                                      });
                                                  }
                                                } catch (err) {
                                                  serviceClient();
                                                }
                                              };
                                              serviceClient();
                                              clearInterval(intervalo);
                                            })
                                            .catch((error) => {
                                              console.error("Erro ao atualizar os documentos:", error);
                                            });
                                        } else {
                                          tempo++;
                                          if (tempo >= 60) {
                                            clearInterval(intervalo);
                                            tempo = 0;

                                          }

                                        }
                                      } catch (err) {
                                        requestMercado();
                                        console.log(err)
                                      }
                                    }

                                    requestMercado();
                                  }, 5000);
                                }
                              })
                              .catch((err) => {
                                console.log("Erro ao obter o cliente:", err);
                              });
                          });
                      }
                    })
                    .catch((err) => {
                      console.log("Erro ao obter o cliente:", err);
                    });
                } else {
                  // console.log("Quantidade vazia")
                }
              } else {
                //Console.log(Valor total menor que um ou igual zero)
              }
            } else {
              //console.log("quantidade minima");
            }
          } else {
            // console.log("Telefone Inválido");
          }
        } else {
          //console.log("E-mail inválido");
        }
      } else {
        //console.log("link vazio");
      }
    } else {
      //console.log("telefone vazio");
    }
  } else {
    //console.log("Email vazio");
  }
});

module.exports = router;
