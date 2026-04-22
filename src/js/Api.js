export default class Api {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async request(action, options = {}) {
    const { id, method = 'GET', body } = options;
    const url = new URL(this.baseUrl);

    url.searchParams.set('method', action);

    if (id) {
      url.searchParams.set('id', id);
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  getAllTickets() {
    return this.request('allTickets');
  }

  getTicketById(id) {
    return this.request('ticketById', { id });
  }

  createTicket(data) {
    return this.request('createTicket', {
      method: 'POST',
      body: data,
    });
  }

  updateTicket(id, data) {
    return this.request('updateById', {
      id,
      method: 'POST',
      body: data,
    });
  }

  deleteTicket(id) {
    return this.request('deleteById', { id });
  }
}
