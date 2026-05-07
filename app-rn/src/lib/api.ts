import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';

const BASE_URL = API_URL ?? 'http://10.0.2.2:3001';

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 15000,
});

api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('@minhanutrionline:token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
