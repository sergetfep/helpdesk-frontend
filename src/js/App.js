import Api from './Api';
import formatDate from './formatDate';

export default class App {
  constructor(baseUrl) {
    this.api = new Api(baseUrl);
    this.container = document.getElementById('tickets');
    this.modalRoot = document.getElementById('modal-root');
    this.addButton = document.getElementById('add-ticket');
    this.tickets = [];
  }

  init() {
    this.bindEvents();
    this.loadTickets();
  }

  bindEvents() {
    this.addButton.addEventListener('click', () => {
      this.openTicketModal();
    });

    this.container.addEventListener('click', (event) => {
      const statusButton = event.target.closest('[data-action="status"]');
      const editButton = event.target.closest('[data-action="edit"]');
      const deleteButton = event.target.closest('[data-action="delete"]');
      const name = event.target.closest('[data-action="details"]');

      if (statusButton) {
        this.toggleStatus(statusButton.closest('.ticket').dataset.id);
        return;
      }

      if (editButton) {
        this.editTicket(editButton.closest('.ticket').dataset.id);
        return;
      }

      if (deleteButton) {
        this.confirmDelete(deleteButton.closest('.ticket').dataset.id);
        return;
      }

      if (name) {
        this.toggleDetails(name.closest('.ticket').dataset.id);
      }
    });

    this.modalRoot.addEventListener('click', (event) => {
      if (
        event.target === this.modalRoot ||
        event.target.dataset.action === 'close-modal'
      ) {
        this.closeModal();
      }
    });
  }

  async loadTickets() {
    this.renderMessage('Загрузка...');

    try {
      this.tickets = await this.api.getAllTickets();
      this.renderTickets();
    } catch {
      this.renderMessage('Не удается загрузить тикеты');
    }
  }

  renderMessage(text) {
    this.container.innerHTML = `<div class="tickets__loading">${text}</div>`;
  }

  renderTickets() {
    if (!this.tickets.length) {
      this.container.innerHTML =
        '<div class="tickets__empty">Тикетов пока нет</div>';
      return;
    }

    this.container.innerHTML = this.tickets
      .map(
        (ticket) => `
          <div class="ticket" data-id="${ticket.id}">
            <div class="ticket__row">
              <button
                class="ticket__status ${ticket.status ? 'ticket__status_done' : ''}"
                type="button"
                data-action="status"
                aria-label="Сменить статус"
              ></button>
              <div class="ticket__name" data-action="details">${ticket.name}</div>
              <div class="ticket__date">${formatDate(ticket.created)}</div>
              <button class="ticket__action" type="button" data-action="edit" aria-label="Редактировать">✎</button>
              <button class="ticket__action" type="button" data-action="delete" aria-label="Удалить">×</button>
            </div>
            <div class="ticket__details"></div>
          </div>
        `,
      )
      .join('');
  }

  openModal(markup) {
    this.modalRoot.innerHTML = markup;
  }

  closeModal() {
    this.modalRoot.innerHTML = '';
  }

  openTicketModal(ticket = null) {
    const title = ticket ? 'Изменить тикет' : 'Добавить тикет';
    const buttonText = ticket ? 'Сохранить' : 'Добавить';

    this.openModal(`
      <div class="modal">
        <h2 class="modal__title">${title}</h2>
        <form class="ticket-form">
          <label class="modal__label" for="ticket-name">Краткое описание</label>
          <input
            class="modal__field"
            id="ticket-name"
            name="name"
            type="text"
            value="${ticket ? this.escapeAttribute(ticket.name) : ''}"
            required
          />

          <label class="modal__label" for="ticket-description">Подробное описание</label>
          <textarea
            class="modal__field modal__field_textarea"
            id="ticket-description"
            name="description"
          >${ticket ? this.escapeHtml(ticket.description || '') : ''}</textarea>

          <div class="modal__actions">
            <button class="button" type="button" data-action="close-modal">Отмена</button>
            <button class="button" type="submit">${buttonText}</button>
          </div>
        </form>
      </div>
    `);

    const form = this.modalRoot.querySelector('.ticket-form');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const name = formData.get('name').trim();
      const description = formData.get('description').trim();

      if (!name) {
        return;
      }

      const payload = { name, description };

      try {
        if (ticket) {
          await this.api.updateTicket(ticket.id, payload);
        } else {
          await this.api.createTicket(payload);
        }

        this.closeModal();
        await this.loadTickets();
      } catch {
        alert('Не удалось сохранить тикет');
      }
    });
  }

  async editTicket(id) {
    try {
      const ticket = await this.api.getTicketById(id);
      this.openTicketModal(ticket);
    } catch {
      alert('Не удалось загрузить тикет');
    }
  }

  confirmDelete(id) {
    this.openModal(`
      <div class="modal">
        <h2 class="modal__title">Удалить тикет</h2>
        <p class="modal__text">Вы уверены, что хотите удалить тикет? Это действие нельзя отменить.</p>

        <div class="modal__actions">
          <button class="button" type="button" data-action="close-modal">Отмена</button>
          <button class="button button_danger" type="button" data-action="confirm-delete">Удалить</button>
        </div>
      </div>
    `);

    const confirmButton = this.modalRoot.querySelector(
      '[data-action="confirm-delete"]',
    );

    confirmButton.addEventListener('click', async () => {
      try {
        await this.api.deleteTicket(id);
        this.closeModal();
        await this.loadTickets();
      } catch {
        alert('Не удалось удалить тикет');
      }
    });
  }

  async toggleStatus(id) {
    const ticket = this.tickets.find((item) => item.id === id);

    if (!ticket) {
      return;
    }

    const nextStatus = !ticket.status;
    const statusButton = this.container.querySelector(
      `[data-id="${id}"] [data-action="status"]`,
    );

    if (!statusButton) {
      return;
    }

    statusButton.disabled = true;

    try {
      await this.api.updateTicket(id, { status: nextStatus });

      ticket.status = nextStatus;
      statusButton.classList.toggle('ticket__status_done', nextStatus);
    } catch {
      alert('Не удалось обновить статус');
    } finally {
      statusButton.disabled = false;
    }
  }

  async toggleDetails(id) {
    const ticketElement = this.container.querySelector(`[data-id="${id}"]`);
    const details = ticketElement.querySelector('.ticket__details');

    if (details.classList.contains('ticket__details_open')) {
      details.classList.remove('ticket__details_open');
      return;
    }

    if (!details.textContent.trim()) {
      try {
        const ticket = await this.api.getTicketById(id);
        details.textContent = ticket.description || 'Без подробного описания';
      } catch {
        details.textContent = 'Не удалось загрузить описание';
      }
    }

    details.classList.add('ticket__details_open');
  }

  escapeHtml(text) {
    return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  escapeAttribute(text) {
    return this.escapeHtml(text).replaceAll('"', '&quot;');
  }
}
