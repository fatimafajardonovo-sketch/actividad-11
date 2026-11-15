import mongoose from "mongoose"; 
const envioSchema = new mongoose.Schema (
      {
    trackingCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    destinatario: {
      type: String,
      required: true,
      trim: true,
      minlength: 3
    },

    ciudadDestino: {
      type: String,
      required: true,
      trim: true
    },

    estado: {
      type: String,
      required: true,
      enum: ['En Almacén', 'En Reparto', 'Entregado', 'Incidencia'],
      default: 'En Almacén'
    },

    prioridad: {
      type: String,
      required: true,
      enum: ['Estándar', 'Express', 'Urgente'],
      default: 'Estándar'
    },

    repartidor: {
      type: String,
      trim: true
    },

    intentosEntrega: {
      type: Number,
      default: 0,
      min: 0,
      max: 3
    },

    notasRuta: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);


const Ticket = mongoose.models.Ticket || mongoose.model ("Envio", envioSchema)

export default Envio;