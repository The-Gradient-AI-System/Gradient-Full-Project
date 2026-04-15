const DEFAULT_API_URL = 'http://127.0.0.1:8000';



const API_URL = (typeof process !== 'undefined' && process.env.REACT_APP_API_URL) || DEFAULT_API_URL;



let authToken = null;



const getSessionStorage = () => {

  if (typeof window === 'undefined') return null;

  try {

    return window.sessionStorage;

  } catch (error) {

    console.warn('Session storage unavailable:', error);

    return null;

  }

};



export const loadAuthToken = () => {

  const storage = getSessionStorage();

  authToken = storage?.getItem('authToken') || null;

  return authToken;

};



export const setAuthToken = token => {

  authToken = token;

  const storage = getSessionStorage();

  if (!storage) return;



  if (token) {

    storage.setItem('authToken', token);

  } else {

    storage.removeItem('authToken');

  }

};



export const clearAuthToken = () => setAuthToken(null);



const parseJsonSafely = async response => {

  const text = await response.text();

  if (!text) return null;

  try {

    return JSON.parse(text);

  } catch (error) {

    throw new Error(text || response.statusText);

  }

};



const request = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  const isFormData =
    typeof FormData !== 'undefined' && options?.body && options.body instanceof FormData;
  // For FormData we must NOT set Content-Type manually (browser adds proper boundary).
  if (!isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  if (!authToken) {
    loadAuthToken();
  }

  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });



  if (!response.ok) {

    const errorBody = await parseJsonSafely(response).catch(() => null);

    const detail = errorBody?.detail || errorBody?.message;

    throw new Error(detail || response.statusText || 'Request failed');

  }



  if (response.status === 204) {

    return null;

  }



  return parseJsonSafely(response);

};



export const loginRequest = credentials =>

  request('/auth/login', {

    method: 'POST',

    body: JSON.stringify(credentials),

  });



export const registerRequest = payload =>

  request('/auth/register', {

    method: 'POST',

    body: JSON.stringify(payload),

  });



export const postGmailSync = () =>

  request('/gmail/sync', {

    method: 'POST',

  });



export const getGmailLeads = (rangeDays = null) => {
  const qs = rangeDays ? `?range_days=${encodeURIComponent(rangeDays)}` : '';
  return request(`/gmail/leads${qs}`);
};



export const postLeadInsights = (payload) =>

  request('/gmail/lead-insights', {

    method: 'POST',

    body: JSON.stringify(payload),

  });



export const getLeadProfile = (email) => request(`/gmail/lead-profile?email=${encodeURIComponent(email)}`);

export const getStatusHistory = (gmail_id) => request(`/gmail/status-history?gmail_id=${encodeURIComponent(gmail_id)}`);

export const postLeadStatus = (payload) =>
  request('/gmail/lead-status', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const assignLead = (gmail_id) =>
  request('/leads/assign', {
    method: 'POST',
    body: JSON.stringify({ gmail_id }),
  });

export const deleteLead = (gmail_id) =>
  request(`/leads/delete?gmail_id=${encodeURIComponent(gmail_id)}`, {
    method: 'DELETE',
  });



export const postGenerateReplies = (payload) =>

  request('/gmail/generate-replies', {

    method: 'POST',

    body: JSON.stringify(payload),

  });



export const getReplyPrompts = () => request('/settings/reply-prompts');



export const updateReplyPrompts = (payload) =>
  request('/settings/reply-prompts', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const sendEmailWithAttachments = (payload) => {
  const formData = new FormData();

  // Add text fields
  Object.keys(payload).forEach(key => {
    if (key !== 'attachments') {
      formData.append(key, payload[key]);
    }
  });

  // Add files
  if (payload.attachments) {
    payload.attachments.forEach(file => {
      formData.append('attachments', file);
    });
  }

  return request('/email/send', {
    method: 'POST',
    body: formData,
    headers: {}, // Let browser set Content-Type for FormData
  });
};
