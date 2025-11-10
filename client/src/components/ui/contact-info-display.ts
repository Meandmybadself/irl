import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ContactInformation } from '@irl/shared';
import { ContactType, PrivacyLevel } from '@irl/shared';
import { backgroundColors, textColors } from '../../utilities/text-colors.js';

@customElement('contact-info-display')
export class ContactInfoDisplay extends LitElement {
  createRenderRoot() {
    return this;
  }

  @property({ type: Array })
  contactInformations: ContactInformation[] = [];

  @property({ type: Boolean })
  showPrivate = false;

  private getContactTypeIcon(type: ContactType) {
    switch (type) {
      case ContactType.EMAIL:
        return html`<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>`;
      case ContactType.PHONE:
        return html`<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>`;
      case ContactType.ADDRESS:
        return html`<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>`;
      case ContactType.URL:
        return html`<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>`;
    }
  }

  private renderContactValue(item: ContactInformation) {
    // Guard against null/undefined values
    if (!item.value || item.value.trim() === '') {
      return html`<span class="${textColors.muted} italic">No value provided</span>`;
    }

    switch (item.type) {
      case ContactType.EMAIL:
        return html`<a href="mailto:${item.value}" class="${textColors.link} ${textColors.linkHover}">${item.value}</a>`;
      case ContactType.PHONE:
        return html`<a href="tel:${item.value}" class="${textColors.link} ${textColors.linkHover}">${item.value}</a>`;
      case ContactType.URL:
        return html`<a href="${item.value}" target="_blank" rel="noopener noreferrer" class="${textColors.link} ${textColors.linkHover}">${item.value}</a>`;
      default:
        return html`<span class="${textColors.primary}">${item.value}</span>`;
    }
  }

  render() {
    const visibleContacts = this.showPrivate
      ? this.contactInformations
      : this.contactInformations.filter(c => c.privacy === PrivacyLevel.PUBLIC);

    if (visibleContacts.length === 0) {
      return html`
        <div class="space-y-4">
          <h3 class="text-lg font-medium ${textColors.primary}">Contact Information</h3>
          <div class="text-center py-8 text-sm ${textColors.tertiary}">
            No contact information available.
          </div>
        </div>
      `;
    }

    return html`
      <div class="space-y-4">
        <h3 class="text-lg font-medium ${textColors.primary}">Contact Information</h3>
        <div class="space-y-3">
          ${visibleContacts.map(
            item => html`
              <div class="flex items-start gap-3 p-4 border rounded-lg ${backgroundColors.content} ${backgroundColors.border}">
                <div class="${textColors.muted} mt-0.5">
                  ${this.getContactTypeIcon(item.type)}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium ${textColors.primary}">${item.label}</span>
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.privacy === PrivacyLevel.PUBLIC ? `${backgroundColors.badgePublic} ${textColors.success}` : `${backgroundColors.badgePrivate} ${textColors.secondary}`}">
                      ${item.privacy === PrivacyLevel.PUBLIC ? 'Public' : 'Private'}
                    </span>
                  </div>
                  <div class="mt-1 text-sm break-words">${this.renderContactValue(item)}</div>
                </div>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'contact-info-display': ContactInfoDisplay;
  }
}
