const express = require("express");
const { Server: HTTPServer, Server } = require("http");
const { Server: SocketServer } = require("socket.io");
const events = require("./socket_events");
const messageDAO = require("./daos/messagesDao")
const productDAO = require("./daos/productsDao")


const app = express();
const session=require('express-session')
const httpServer = new HTTPServer(app);
const socketServer = new SocketServer(httpServer);
const handlebars = require("express-handlebars");
const { Router } = express;
const routerProducto = Router();
const hbs = handlebars.create({
  extname: ".hbs",
  defaultLayout: "index.hbs",
  layoutsDir: __dirname + "/public/views/layout",
  partialsDir: __dirname + "/public/views/partials/",
});
const MongoStore=require('connect-mongo');
const advancedOptions={useNewUrlParser:true, useUnifiedTopology:true}

app.use(session({

store:MongoStore.create({
  mongoUrl:'mongodb+srv://lucasiannu:wxRk2hMHkRguBXdU@cluster0.l96bh3b.mongodb.net/?retryWrites=true&w=majority',
  ttl:60,
  mongoOptions:advancedOptions
}),


  secret:'secret_String',
  resave:false,
  saveUninitialized:true
}))
app.use(express.static("public"));
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use("/", routerProducto);

app.engine("hbs", hbs.engine);

app.set("views", "./public/views/partials");
app.set("view engine", "hbs");


routerProducto.get('/login',(req,res)=>{
  res.render('logIn.hbs')
})

routerProducto.post('/login',(req,res)=>{
  const {usuario,password}=req.body
  console.log(usuario)
  if(usuario==='lucas' && password=='1234'){
    req.session.user=usuario
    res.redirect('/')
    return
  }
  res.status(401).send('Credenciales invalidas')

})


let messages = "";


routerProducto.get("/", async (req, res) => {
  try {
    const usuario=req.session.user
    const userExists=usuario?true:false
    const allProducts = await productDAO.getAll();
    if (allProducts.length > 0) {
      res.render("main.hbs", { allProducts: allProducts, arrayExists: true, userExists:userExists,usuario:usuario });
    } else {
      res.render("main.hbs", { allProducts: allProducts, arrayExists: false,userExists:userExists,usuario:usuario });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

routerProducto.get('/api/productos-test', async (req,res)=>{
  try{
    const result = await productDAO.generateProducts(5)
    res.json(result)
  }catch(err){
    res.status(400).json({ error: err.message })
  }

})

routerProducto.get('/logout', (req,res)=>{
  req.session.destroy(err=>{
    if(err){
      res.send('Error al cerrar sesion')
    }else{
      res.redirect('/login')
    }
  })
})

async function getMsg(){
  try {
    messages= await messageDAO.getAllMsg()
  } catch (error) {
    
  }
}

getMsg()

socketServer.on("connection", (socket) => {
  console.log("Nuevo cliente conectado");
  socketServer.emit("INIT", "Bienvenido al WebSocket", messages);


  socket.on(events.POST_MESSAGE, (msg) => {
    messageDAO.saveMsg(msg);
    socketServer.sockets.emit(events.NEW_MESSAGE, msg);
  });

  socket.on(events.POST_PRODUCT, (product) => {
    productDAO.saveProduct(product).then((response) => {
      socketServer.sockets.emit(events.NEW_PRODUCT, product);
    });
  });
});

const PORT = 8080;
httpServer.listen(PORT, () => {
  console.log(`Servidor escuchando el puerto ${PORT}`);
});


