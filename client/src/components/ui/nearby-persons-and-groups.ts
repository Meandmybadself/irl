import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import type { Person, PersonWithDistance, GroupWithDistance } from '@irl/shared';
import { textStyles, backgroundColors, textColors } from '../../utilities/text-colors.js';
import { renderIcon } from '../../utilities/icons.js';
import { apiContext } from '../../contexts/api-context.js';
import type { ApiClient } from '../../services/api-client.js';

@customElement('nearby-persons-and-groups')
export class NearbyPersonsAndGroups extends LitElement {
  createRenderRoot() {
    return this;
  }

  @consume({ context: apiContext })
  @state()
  private api!: ApiClient;

  @property({ type: Object })
  currentPerson: Person | null = null;

  @state()
  private nearbyPersons: PersonWithDistance[] = [];

  @state()
  private nearbyGroups: GroupWithDistance[] = [];

  @state()
  private isLoading = false;

  @state()
  private error: string | null = null;

  @state()
  private hasNoLocations = false;

  async connectedCallback() {
    super.connectedCallback();
    await this.loadNearby();
  }

  private async loadNearby() {
    if (!this.currentPerson) {
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.hasNoLocations = false;

    try {
      const response = await this.api.getNearby(1); // 1 mile radius

      if (response.success && response.data) {
        this.nearbyPersons = response.data.persons;
        this.nearbyGroups = response.data.groups;

        // Check if we have no reference locations
        if (response.data.referencePointsCount === 0) {
          this.hasNoLocations = true;
        }
      } else {
        this.error = response.error || 'Failed to load nearby people and groups';
      }
    } catch (err: any) {
      this.error = err.message || 'Failed to load nearby people and groups';
    } finally {
      this.isLoading = false;
    }
  }

  private handlePersonClick(displayId: string) {
    window.history.pushState({}, '', `/persons/${displayId}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  private handleGroupClick(displayId: string) {
    window.history.pushState({}, '', `/groups/${displayId}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  private getInitials(person: Person): string {
    const first = person.firstName?.charAt(0) || '';
    const last = person.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  }

  private formatDistance(miles: number): string {
    if (miles < 0.1) return '< 0.1 mi';
    return `${miles.toFixed(1)} mi`;
  }

  private renderLoading(): TemplateResult {
    return html`
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    `;
  }

  private renderNoLocations(): TemplateResult {
    return html`
      <div class="text-center py-8">
        <div class="flex justify-center mb-4">
          ${renderIcon('MapPin', 'w-12 h-12 ' + textColors.tertiary)}
        </div>
        <p class="${textStyles.body.small}">
          Add a location to your profile or join a group to discover nearby people and groups.
        </p>
      </div>
    `;
  }

  private renderNoResults(): TemplateResult {
    return html`
      <div class="text-center py-8">
        <p class="${textStyles.body.small}">
          No nearby people or groups within 1 mile.
        </p>
      </div>
    `;
  }

  private renderError(): TemplateResult {
    return html`
      <div class="text-center py-8">
        <p class="text-red-600 dark:text-red-400">
          ${this.error}
        </p>
      </div>
    `;
  }

  private renderPersonCard(person: PersonWithDistance): TemplateResult {
    const distanceText = this.formatDistance(person.distance);

    return html`
      <div
        @click=${() => this.handlePersonClick(person.displayId)}
        class="flex items-center gap-4 p-4 rounded-lg ${backgroundColors.content} ${backgroundColors.contentHover} cursor-pointer transition-colors"
      >
        <!-- Avatar -->
        <div class="flex-shrink-0">
          ${person.imageURL
            ? html`
                <img
                  src="${person.imageURL}"
                  alt="${person.firstName} ${person.lastName}"
                  class="h-12 w-12 rounded-full object-cover"
                />
              `
            : html`
                <div class="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center">
                  <span class="text-lg font-medium text-white">
                    ${this.getInitials(person)}
                  </span>
                </div>
              `}
        </div>

        <!-- Person Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            ${renderIcon('User', 'w-4 h-4 ' + textColors.tertiary)}
            <p class="${textColors.primary} font-medium truncate text-sm">
              ${person.firstName} ${person.lastName}
            </p>
          </div>
          ${person.pronouns
            ? html`
                <p class="${textColors.tertiary} text-xs">
                  ${person.pronouns}
                </p>
              `
            : ''}
        </div>

        <!-- Distance Badge -->
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            ${distanceText}
          </span>
          ${renderIcon('ChevronRight', 'w-5 h-5 ' + textColors.tertiary)}
        </div>
      </div>
    `;
  }

  private renderGroupCard(group: GroupWithDistance): TemplateResult {
    const distanceText = this.formatDistance(group.distance);

    return html`
      <div
        @click=${() => this.handleGroupClick(group.displayId)}
        class="flex items-center gap-4 p-4 rounded-lg ${backgroundColors.content} ${backgroundColors.contentHover} cursor-pointer transition-colors"
      >
        <!-- Icon -->
        <div class="flex-shrink-0">
          <div class="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center">
            ${renderIcon('Users', 'w-6 h-6 text-white')}
          </div>
        </div>

        <!-- Group Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            ${renderIcon('Users', 'w-4 h-4 ' + textColors.tertiary)}
            <p class="${textColors.primary} font-medium truncate text-sm">
              ${group.name}
            </p>
          </div>
          ${group.description
            ? html`
                <p class="${textColors.tertiary} text-xs truncate">
                  ${group.description}
                </p>
              `
            : ''}
        </div>

        <!-- Distance Badge -->
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            ${distanceText}
          </span>
          ${renderIcon('ChevronRight', 'w-5 h-5 ' + textColors.tertiary)}
        </div>
      </div>
    `;
  }

  private renderResults(): TemplateResult {
    const hasResults = this.nearbyPersons.length > 0 || this.nearbyGroups.length > 0;

    if (!hasResults) {
      return this.renderNoResults();
    }

    return html`
      <div class="space-y-2">
        ${this.nearbyPersons.map(person => this.renderPersonCard(person))}
        ${this.nearbyGroups.map(group => this.renderGroupCard(group))}
      </div>
    `;
  }

  render() {
    return html`
      <div class="${backgroundColors.content} rounded-lg shadow-sm p-6">
        <h2 class="${textStyles.heading.h3} mb-1">
          Nearby People & Groups
        </h2>
        <p class="${textColors.tertiary} text-sm mb-4">
          Within 1 mile
        </p>

        ${this.isLoading
          ? this.renderLoading()
          : this.hasNoLocations
          ? this.renderNoLocations()
          : this.error
          ? this.renderError()
          : this.renderResults()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nearby-persons-and-groups': NearbyPersonsAndGroups;
  }
}
