import mongoose from "mongoose";
import Envio from "../models/Envio.js";

export default async function handler(req,res) {
    try {
        if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI)
        }
        const {method} = req;
        // readyState === 0 significa que Mongoose está desconectado. await espera a que la conexión se complete antes de hacer la consulta.
        if (method === "GET") {
            // req.query contiene parámetros como ?estado=En%20Reparto. Se comprueba que estado y ciudad sean textos.
            const { estado, ciudad, sinRepartidor } = req.query;
            const filtro = {};
            if (estado !== undefined) {
                if (typeof estado !== "string") {
                return res.status(400).json({ error: "El parámetro estado debe ser un texto." });
                }
                filtro.estado = estado;
            }
            // ciudad usa $regex para buscar texto dentro de ciudadDestino; $options: "i" ignora mayúsculas y minúsculas
            // escapeRegex evita que caracteres especiales de la entrada se interpreten como parte de una expresión regular.
            if (ciudad !== undefined) {
                if (typeof ciudad !== "string") {
                return res.status(400).json({ error: "El parámetro ciudad debe ser un texto." }); }
                filtro.ciudadDestino = {
                $regex: escapeRegex(ciudad),
                $options: "i" };
            }
            // añade $exists: false, que selecciona envíos en los que el campo repartidor no está guardado
            if (sinRepartidor !== undefined) {
                // se comprueba que su valor sea "true" o "false". Si no, se responde con 400 y se detiene la función
                if (sinRepartidor !== "true" && sinRepartidor !== "false") {
                return res.status(400).json({ error: "sinRepartidor debe ser true o false." });
                }
                if (sinRepartidor === "true") {
                filtro.repartidor = { $exists: false };
                }
            }
            //Envio.find(filtro) devuelve los envíos que coinciden; .sort({ createdAt: -1 }) los ordena del más reciente al más antiguo
            // La respuesta HTTP 200 incluye el total y los datos
            const envios = await Envio.find(filtro).sort({ createdAt: -1 });
            return res.status(200).json({ total: envios.length, datos: envios });
    }
    
    // POST: crea un envío nuevo con los datos del cuerpo JSON;  comprobamos que req.body sea un objeto JSON válido
    if (method === "POST") {
      if (!isObject(req.body)) {
        return res.status(400).json({ error: "El cuerpo debe ser un objeto JSON." });
      }
      //  guarda los datos recibidos en MongoDB y espera a que termine. El documento creado queda guardado en
      const nuevoEnvio = await Envio.create(req.body);
      //  esponde que la creación fue exitosa (201 Created) y devuelve un JSON con un mensaje y el documento creado
      return res.status(201).json({
        mensaje: "Envío creado con éxito.",
        envio: nuevoEnvio
      });
    }

    




    // Si el método no coincide con GET, POST o PATCH, la respuesta no admite esa operación
    res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
    return res.status(405).json({ error: `Método ${method || "desconocido"} no permitido.` });

    }

  catch (error) {
    return res.status(500).json({
      error: "Error en la operación CRUD.",
      detalle: error.message
    });
  }

}