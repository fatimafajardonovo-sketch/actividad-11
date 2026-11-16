import mongoose from "mongoose"; //Importamos la bbdd de mongoose
import dotenv from "dotenv"; // dotenv carga las variales de entornos desde el archivo dotenv
import Envio from "./models/envio.js";

dotenv.config(); 

async function ejecutarCRUD() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log ("Conectado a mongoDB Atlas");

    // Limpiar colección antes de comenzar
    await Envio.deleteMany({});
    console.log('\n La colección está limpia antes de comenzar');

    // FASE 1: Envíos iniciales
    console.log("---1. Fase Create: Inserta los envíos iniciales")

    const enviosIniciales = await Envio.insertMany([
      {
        trackingCode: 'ENV-9001',
        destinatario: 'Carlos García',
        ciudadDestino: 'Madrid',
        estado: 'En Almacén',
        prioridad: 'Estándar',
        notasRuta: ['fragil', 'asegurado']
      },
      {
        trackingCode: 'ENV-9002',
        destinatario: 'Ana López',
        ciudadDestino: 'Valencia',
        estado: 'En Reparto',
        prioridad: 'Express',
        repartidor: 'Juan Pérez',
        intentosEntrega: 1,
        notasRuta: ['llamar-antes']
      },
      {
        trackingCode: 'ENV-9003',
        destinatario: 'María Sánchez',
        ciudadDestino: 'Barcelona',
        estado: 'Incidencia',
        prioridad: 'Urgente',
        notasRuta: ['fragil']
      },
      {
        trackingCode: 'ENV-9004',
        destinatario: 'Pedro Martín',
        ciudadDestino: 'Valencia',
        estado: 'Entregado',
        prioridad: 'Estándar',
        repartidor: 'Luis Torres',
        intentosEntrega: 1,
        notasRuta: ['asegurado']
      },
      {
        trackingCode: 'ENV-9005',
        destinatario: 'Laura Fernández',
        ciudadDestino: 'Madrid',
        estado: 'En Almacén',
        prioridad: 'Urgente',
        notasRuta: ['fragil', 'asegurado']
      },
      {
        trackingCode: 'ENV-9006',
        destinatario: 'Sofía Ruiz',
        ciudadDestino: 'Sevilla',
        estado: 'En Reparto',
        prioridad: 'Express',
        repartidor: 'Marta Gómez',
        intentosEntrega: 2,
        notasRuta: ['llamar-antes', 'portero']
      },
      {
        trackingCode: 'ENV-9007',
        destinatario: 'Diego Navarro',
        ciudadDestino: 'Bilbao',
        estado: 'Entregado',
        prioridad: 'Estándar',
        repartidor: 'Álvaro Díaz',
        intentosEntrega: 1,
        notasRuta: ['asegurado']
      },
      {
        trackingCode: 'ENV-9008',
        destinatario: 'Lucía Romero',
        ciudadDestino: 'Zaragoza',
        estado: 'Incidencia',
        prioridad: 'Urgente',
        intentosEntrega: 3,
        notasRuta: ['dirección-incompleta']
      },
      {
        trackingCode: 'ENV-9009',
        destinatario: 'Pablo Jiménez',
        ciudadDestino: 'Málaga',
        estado: 'En Almacén',
        prioridad: 'Estándar',
        notasRuta: ['fragil']
      },
      {
        trackingCode: 'ENV-9010',
        destinatario: 'Elena Castro',
        ciudadDestino: 'Alicante',
        estado: 'En Reparto',
        prioridad: 'Urgente',
        repartidor: 'Nuria León',
        intentosEntrega: 0,
        notasRuta: ['entrega-mañana']
      }
    ]);

    console.log(`Se crearon ${enviosIniciales.length} envíos\n`);

    // FASE 2: READ: consulta envíos con distintos operadores de MongoDB
    console.log("---2. Fase Read: Consultas con operadores");
    // $or devuelve envíos que cumplen al menos una de las dos condiciones
    const consultaOR = await Envio.find({ $or: [ { prioridad: 'Urgente' },  { estado: 'Incidencia' } ] });
    console.log('\nEnvíos urgentes o con incidencia:', consultaOR);

    // $exists: false busca documentos que no tienen el campo repartidor
    const consultaExists = await Envio.find({ repartidor: { $exists: false } });
    console.log('\nEnvíos sin repartidor asignado:', consultaExists);

    // $regex busca el texto indicado; la opción i ignora mayúsculas y minúsculas
    const consultaRegex = await Envio.find({ ciudadDestino: { $regex: 'valencia', $options: 'i' } });
    console.log('\nEnvíos con destino Valencia:', consultaRegex);

    // $all exige que notasRuta contenga los dos valores, en cualquier orden
    const consultaAll = await Envio.find({ notasRuta: { $all: ['fragil', 'asegurado'] }});
    console.log('\nEnvíos con notas de ruta "fragil" y "asegurado":', consultaAll);


    // FASE 3: UPDATE: actualiza un envío concreto y devuelve el documento actualizado
    const envioActualizado = await Envio.findOneAndUpdate(
      { trackingCode: 'ENV-9001' },
      {
        $set: {
          repartidor: 'Pedro Ramírez',
          estado: 'En Reparto'
        },
        // Incrementa intentosEntrega y añade una nota sin reemplazar las existentes
        $inc: { intentosEntrega: 1 },
        $push: { notasRuta: 'Intento 1 realizado' }
      },
      {
        // new devuelve los valores posteriores a la actualización
        new: true,
        runValidators: true
      }
    );
    console.log("Envío ENV-9001 actualizado:", {
      trackingCode: envioActualizado.trackingCode,
      destinatario: envioActualizado.destinatario,
      repartidor: envioActualizado.repartidor,
      estado: envioActualizado.estado,
      intentosEntrega: envioActualizado.intentosEntrega,
      notasRuta: envioActualizado.notasRuta
    });

    // Guardamos los IDs antes de actualizar para poder mostrar después esos documentos
    const enviosSinRepartidor = await Envio.find({ repartidor: { $exists: false }}).select('_id');

    // Asigna el mismo repartidor a todos los envíos que aún no tienen uno
    const actualizacionMasiva = await Envio.updateMany(
      {
        repartidor: { $exists: false }
      },
      {
        $set: {repartidor: 'Flota Central' }
      },
      {
        runValidators: true
      }
    );

    // Recupera los documentos modificados usando los IDs guardados antes del updateMany
    const enviosActualizados = await Envio.find({
      _id: { $in: enviosSinRepartidor.map(envio => envio._id) }
    });

    console.log('Envíos actualizados masivamente:', enviosActualizados.map(envio => ({
      trackingCode: envio.trackingCode,
      destinatario: envio.destinatario,
      repartidor: envio.repartidor,
      estado: envio.estado,
      intentosEntrega: envio.intentosEntrega,
      notasRuta: envio.notasRuta
    })));
    console.log('Documentos modificados:', actualizacionMasiva.modifiedCount);

    // FASE 4: DELETE
    // Busca y elimina un envío entregado; findOneAndDelete devuelve el documento eliminado
    const envioEliminado = await Envio.findOneAndDelete({
      estado: 'Entregado'
    });

    if (envioEliminado) {
      console.log('Envío eliminado:', envioEliminado.trackingCode);
    } else {
      console.log('No se encontró ningún envío entregado');
    }

    // Cuenta los documentos que siguen en la colección tras las operaciones CRUD
    const totalRestantes = await Envio.countDocuments();
    console.log('\n Envíos activos restantes:', totalRestantes);
  } 
  catch (error) {
    console.error ("Error en el lab:", error.message)
  } 
  finally {
    // Cerrar conexión
    await mongoose.disconnect ();
    console.log ("Desconectado de Mongo Atlas");
  }
}

ejecutarCRUD();
