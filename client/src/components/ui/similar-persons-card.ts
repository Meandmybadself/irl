import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import type { Person } from '@irl/shared';
import { textStyles, backgroundColors, textColors } from '../../utilities/text-colors.js';
import { renderIcon } from '../../utilities/icons.js';
import { apiContext } from '../../contexts/api-context.js';
import type { ApiClient } from '../../services/api-client.js';

type PersonWithSimilarity = Person & { similarity?: number };

@customElement('similar-persons-card')
export class SimilarPersonsCard extends LitElement {
  createRenderRoot() {
    return this;
  }

  @consume({ context: apiContext })
  @state()
  private api!: ApiClient;

  @property({ type: Object })
  currentPerson: Person | null = null;

  @property({ type: Number })
  limit = 5;

  @state()
  private recommendations: PersonWithSimilarity[] = [];

  @state()
  private isLoading = false;

  @state()
  private error: string | null = null;

  @state()
  private hasNoInterests = false;

  async connectedCallback() {
    super.connectedCallback();
    await this.loadRecommendations();
  }

  private async loadRecommendations() {
    if (!this.currentPerson) {
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.hasNoInterests = false;

    try {
      const response = await this.api.getRecommendations(this.currentPerson.displayId, this.limit);

      if (response.success && response.data) {
        this.recommendations = response.data;
      } else {
        this.error = response.error || 'Failed to load recommendations';
      }
    } catch (err: any) {
      // Check if error is due to no interests
      if (err.message?.includes('no interests') || err.message?.includes('interests defined')) {
        this.hasNoInterests = true;
      } else {
        this.error = err.message || 'Failed to load recommendations';
      }
    } finally {
      this.isLoading = false;
    }
  }

  private handlePersonClick(displayId: string) {
    window.history.pushState({}, '', `/persons/${displayId}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  private handleAddInterests() {
    window.history.pushState({}, '', '/persons/me');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  private handleViewAll() {
    // Future: could navigate to a dedicated recommendations page
    // For now, this is a placeholder for future enhancement
    console.log('View all recommendations');
  }

  private getInitials(person: Person): string {
    const first = person.firstName?.charAt(0) || '';
    const last = person.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  }

  private getSimilarityColor(similarity: number): string {
    if (similarity >= 0.8) {
      return 'text-green-600 dark:text-green-400';
    } else if (similarity >= 0.6) {
      return 'text-blue-600 dark:text-blue-400';
    } else {
      return textColors.secondary;
    }
  }

  private renderLoading(): TemplateResult {
    return html`
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    `;
  }

  private renderNoInterests(): TemplateResult {
    return html`
      <div class="text-center py-8">
        <div class="flex justify-center mb-4">
          ${renderIcon('Lightbulb', 'w-12 h-12 ' + textColors.tertiary)}
        </div>
        <p class="${textStyles.body.small} mb-4">
          Add interests to your profile to discover people with similar interests.
        </p>
        <button
          @click=${this.handleAddInterests}
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Add Interests
        </button>
      </div>
    `;
  }

  private renderNoResults(): TemplateResult {
    return html`
      <div class="text-center py-8">
        <p class="${textStyles.body.small}">
          No similar people found at this time.
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

  private renderPersonCard(person: PersonWithSimilarity): TemplateResult {
    const similarity = person.similarity || 0;
    const similarityPercent = Math.round(similarity * 100);
    const similarityColor = this.getSimilarityColor(similarity);

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
          <p class="${textColors.primary} font-medium truncate text-sm">
            ${person.firstName} ${person.lastName}
          </p>
          ${person.pronouns
            ? html`
                <p class="${textColors.tertiary} text-xs">
                  ${person.pronouns}
                </p>
              `
            : ''}
        </div>

        <!-- Similarity Score -->
        <div class="flex items-center gap-2">
          <span class="${similarityColor} font-semibold">
            ${similarityPercent}%
          </span>
          ${renderIcon('ChevronRight', 'w-5 h-5 ' + textColors.tertiary)}
        </div>
      </div>
    `;
  }

  private renderRecommendations(): TemplateResult {
    return html`
      <div class="space-y-2">
        ${this.recommendations.map(person => this.renderPersonCard(person))}
      </div>
      ${this.recommendations.length >= this.limit
        ? html`
            <div class="mt-4 text-center">
              <button
                @click=${this.handleViewAll}
                class="${textColors.link} ${textColors.linkHover} text-sm font-medium"
              >
                View all recommendations
              </button>
            </div>
          `
        : ''}
    `;
  }

  render() {
    return html`
      <div class="${backgroundColors.content} rounded-lg shadow-sm p-6">
        <h2 class="${textStyles.heading.h3} mb-4">
          Nearby People & Groups
        </h2>

        ${this.isLoading
          ? this.renderLoading()
          : this.hasNoInterests
          ? this.renderNoInterests()
          : this.error
          ? this.renderError()
          : this.recommendations.length === 0
          ? this.renderNoResults()
          : this.renderRecommendations()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'similar-persons-card': SimilarPersonsCard;
  }
}
