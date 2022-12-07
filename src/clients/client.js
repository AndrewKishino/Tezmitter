export default class Client {
  constructor(hostname = '', headers = {}) {
    this.hostname = hostname;
    this.headers = headers;
  }

  static handleResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      const error = await response.text();
      return Promise.reject(new Error(error));
    }

    if (isJson) {
      return response.json();
    }
    return response.text();
  };

  get = (endpoint, { headers = {} } = {}) =>
    fetch(`${this.hostname}${endpoint}`, {
      method: 'GET',
      headers: {
        ...this.headers,
        ...headers,
      },
    }).then(Client.handleResponse);

  post = (endpoint, { headers = {}, body } = {}) =>
    fetch(`${this.hostname}${endpoint}`, {
      method: 'POST',
      headers: {
        ...this.headers,
        ...headers,
      },
      body,
    }).then(this.handleResponse);

  put = (endpoint, { headers = {}, body } = {}) =>
    fetch(`${this.hostname}${endpoint}`, {
      method: 'PUT',
      headers: {
        ...this.headers,
        ...headers,
      },
      body,
    }).then(this.handleResponse);

  delete = (endpoint, { headers = {}, body } = {}) =>
    fetch(`${this.hostname}${endpoint}`, {
      method: 'DELETE',
      headers: {
        ...this.headers,
        ...headers,
      },
      body,
    }).then(this.handleResponse);
}
