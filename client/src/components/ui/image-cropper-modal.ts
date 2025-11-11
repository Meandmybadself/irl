import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { textColors, backgroundColors } from '../../utilities/text-colors.js';

@customElement('image-cropper-modal')
export class ImageCropperModal extends LitElement {
  // Remove Shadow DOM to use global styles (including Cropper.js CSS)
  createRenderRoot() {
    return this;
  }

  @property({ type: String })
  imageUrl = '';

  @property({ type: Boolean })
  open = false;

  @state()
  private isSaving = false;

  private cropper: Cropper | null = null;
  private currentImageUrl: string | null = null;

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('open')) {
      if (this.open && this.imageUrl) {
        this.initializeCropper();
      } else if (!this.open) {
        this.destroyCropper();
      }
    }

    // Track image URL changes and clean up old object URLs
    if (changedProperties.has('imageUrl')) {
      this.cleanupImageUrl();
      if (this.imageUrl && this.imageUrl.startsWith('blob:')) {
        this.currentImageUrl = this.imageUrl;
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.destroyCropper();
    this.cleanupImageUrl();
  }

  private cleanupImageUrl() {
    if (this.currentImageUrl && this.currentImageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.currentImageUrl);
      this.currentImageUrl = null;
    }
  }

  private initializeCropper() {
    // Wait for the next frame to ensure the image is rendered
    setTimeout(() => {
      // Query the image element directly since we're not using Shadow DOM
      const imageElement = this.querySelector('.image-preview') as HTMLImageElement;
      if (imageElement && !this.cropper) {
        this.cropper = new Cropper(imageElement, {
          aspectRatio: 1,
          viewMode: 1,
          dragMode: 'move',
          autoCropArea: 1,
          restore: false,
          guides: true,
          center: true,
          highlight: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false,
        });
      }
    }, 100);
  }

  private destroyCropper() {
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }
  }

  private handleRotateLeft() {
    this.cropper?.rotate(-90);
  }

  private handleRotateRight() {
    this.cropper?.rotate(90);
  }

  private handleZoomIn() {
    this.cropper?.zoom(0.1);
  }

  private handleZoomOut() {
    this.cropper?.zoom(-0.1);
  }

  private handleReset() {
    this.cropper?.reset();
  }

  private handleCancel() {
    this.dispatchEvent(new CustomEvent('cancel'));
  }

  private async handleSave() {
    if (!this.cropper) return;

    this.isSaving = true;

    try {
      // Get cropped canvas
      const canvas = this.cropper.getCroppedCanvas({
        width: 150,
        height: 150,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      });

      if (!blob) {
        throw new Error('Failed to create image blob');
      }

      this.dispatchEvent(
        new CustomEvent('save', {
          detail: { blob },
        })
      );
    } catch (error) {
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: { error: error instanceof Error ? error.message : 'Failed to process image' },
        })
      );
    } finally {
      this.isSaving = false;
    }
  }

  render() {
    if (!this.open) return html``;

    return html`
      <div 
        class="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4" 
        @click=${(e: Event) => {
          if (e.target === e.currentTarget) this.handleCancel();
        }}
      >
        <div class="max-w-2xl w-full rounded-lg shadow-xl overflow-hidden ${backgroundColors.content}">
          <div class="p-6 border-b" style="border-color: ${backgroundColors.border}">
            <h3 class="text-lg font-semibold ${textColors.primary}">
              Crop Profile Photo
            </h3>
          </div>

          <div class="p-6 max-h-[70vh] overflow-y-auto">
            <div class="flex gap-2 mb-4 flex-wrap">
              <button
                type="button"
                class="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                @click=${this.handleRotateLeft}
                title="Rotate left"
              >
                ↺ Rotate Left
              </button>
              <button
                type="button"
                class="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                @click=${this.handleRotateRight}
                title="Rotate right"
              >
                ↻ Rotate Right
              </button>
              <button
                type="button"
                class="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                @click=${this.handleZoomIn}
                title="Zoom in"
              >
                + Zoom In
              </button>
              <button
                type="button"
                class="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                @click=${this.handleZoomOut}
                title="Zoom out"
              >
                − Zoom Out
              </button>
              <button
                type="button"
                class="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                @click=${this.handleReset}
                title="Reset"
              >
                ⟲ Reset
              </button>
            </div>

            <div class="max-h-96 mb-4">
              <img
                class="image-preview w-full max-h-96 block"
                src=${this.imageUrl}
                alt="Image to crop"
              />
            </div>

            <p class="text-sm ${textColors.tertiary}">
              Adjust the crop area to select the portion of the image you want to use.
              The final image will be 150×150 pixels.
            </p>
          </div>

          <div class="p-6 border-t flex justify-end gap-3" style="border-color: ${backgroundColors.border}">
            <button
              type="button"
              class="px-4 py-2 rounded-md text-sm font-semibold border transition-colors ${textColors.primary}"
              style="border-color: ${backgroundColors.border}"
              @click=${this.handleCancel}
              ?disabled=${this.isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              @click=${this.handleSave}
              ?disabled=${this.isSaving}
            >
              ${this.isSaving
                ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
                : ''}
              Save
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'image-cropper-modal': ImageCropperModal;
  }
}

