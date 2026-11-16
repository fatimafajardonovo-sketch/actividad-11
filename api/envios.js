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
      //  guarda los datos recibidos en MongoDB y espera a que termine. El documento creado queda guardado en
      const nuevoEnvio = await Envio.create(req.body);
      //  esponde que la creación fue exitosa (201 Created) y devuelve un JSON con un mensaje y el documento creado
      return res.status(201).json({
        mensaje: "Envío creado con éxito.",
        envio: nuevoEnvio
      });
    }

    // PATCH: modifica solo los campos indicados para el trackingCode recibido
    if (method === "PATCH") {
      const { trackingCode } = req.query || {};
      if (typeof trackingCode !== "string" || !trackingCode.trim()) {
        return res.status(400).json({ error: "Debes indicar trackingCode en la URL." });
      }

      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return res.status(400).json({ error: "El cuerpo debe ser un objeto JSON." });
      }

      const { estado, repartidor, sumarIntento, nuevaNota, quitarNota } = req.body;
      const actualizacion = {};
      const campos = {};

      if (estado !== undefined) {
        campos.estado = estado;
      }

      if (repartidor !== undefined) {
        campos.repartidor = repartidor;
      }

      if (Object.keys(campos).length > 0) {
        actualizacion.$set = campos;
      }

      if (sumarIntento !== undefined && typeof sumarIntento !== "boolean") {
        return res.status(400).json({ error: "sumarIntento debe ser un booleano." });
      }
      if (sumarIntento === true) {
        actualizacion.$inc = { intentosEntrega: 1 };
      }

      if (nuevaNota !== undefined && typeof nuevaNota !== "string") {
        return res.status(400).json({ error: "nuevaNota debe ser un texto." });
      }

      if (quitarNota !== undefined && typeof quitarNota !== "string") {
        return res.status(400).json({ error: "quitarNota debe ser un texto." });
      }

      if (nuevaNota !== undefined && quitarNota !== undefined) {
        return res.status(400).json({ error: "Indica nuevaNota o quitarNota, no ambas." });
      }

      if (nuevaNota !== undefined) {
        actualizacion.$push = { notasRuta: nuevaNota };
      }
      if (quitarNota !== undefined) {
        actualizacion.$pull = { notasRuta: quitarNota };
      }

      if (Object.keys(actualizacion).length === 0) {
        return res.status(400).json({ error: "No se indicaron cambios para actualizar." });
      }

      const envioModificado = await Envio.findOneAndUpdate(
        { trackingCode: trackingCode.trim().toUpperCase() },
        actualizacion,
        { new: true, runValidators: true }
      );

      if (!envioModificado) {
        return res.status(404).json({ error: "Envío no encontrado." });
      }

      return res.status(200).json({
        mensaje: "Envío actualizado con éxito.",
        envio: envioModificado
      });
    }

    // DELETE: elimina el envío identificado por su trackingCode.
    if (method === "DELETE") {
      const { trackingCode } = req.query || {};
      if (typeof trackingCode !== "string" || !trackingCode.trim()) {
        return res.status(400).json({ error: "Debes indicar trackingCode en la URL." });
      }

      const envioEliminado = await Envio.findOneAndDelete({
        trackingCode: trackingCode.trim().toUpperCase()
      });

      if (!envioEliminado) {
        return res.status(404).json({ error: "Envío no encontrado." });
      }

      return res.status(200).json({
        mensaje: "Envío eliminado con éxito.",
        envio: envioEliminado
      });
    }
    
    // Si el método no coincide con los métodos CRUD admitidos, se devuelve 405.
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