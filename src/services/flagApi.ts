import axios from 'axios';

const api = axios.create (

    {
        baseURL: "https://countriesnow.space/api/v0.1/countries"
    }
)

export const getAllFlags = async() =>
{
    const response = await api.get("/flag/images");

    return response.data.results;
}