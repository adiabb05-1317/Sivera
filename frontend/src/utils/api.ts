import axios from 'axios';

export async function connectToRoom() {
  const res = await axios.post('http://localhost:8000/api/v1/connect');
  return res.data;
}
