import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export async function submitLead(email, source = "waitlist", plan = null) {
  const { data } = await axios.post(`${API}/leads`, { email, source, plan });
  return data;
}
