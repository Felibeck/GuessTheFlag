/**
 * Acceso a la API de banderas (countriesnow.space).
 * La respuesta tiene la forma { error, msg, data: [{ name, flag, iso2, iso3 }] }:
 *   name → nombre del país en inglés
 *   flag → URL de la imagen (Wikimedia)
 *   iso2 → código de dos letras ("ES"), se usa para traducir el nombre al español
 */

import axios from 'axios';

const api = axios.create (

    {
        baseURL: "https://countriesnow.space/api/v0.1/countries"
    }
)

export const getAllFlags = async() =>
{
    const response = await api.get("/flag/images");

    return response.data.data;
}