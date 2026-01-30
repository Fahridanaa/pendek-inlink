export const renderShortenSuccess = (url: string, isNew: boolean) =>
  `
    <div class="neo-card bg-yellow-100" x-data="{ copied: false }">
      <h3 class="text-2xl font-black mb-4">${isNew ? "Berhasil!" : "Link ini sudah ada!"}</h3>

      <div class="space-y-4">
        <div>
          <label class="font-bold text-sm uppercase block mb-2">
          versi pendek link:
          </label>
          <div class="flex gap-2">
            <input
              x-ref="shortUrl"
              type="text"
              value="${url}"
              readonly
              class="neo-input flex-1"
              :class="{ 'selected': copied }"
              x-transition
            >
            <button
              @click="
                $refs.shortUrl.select();
                navigator.clipboard.writeText($refs.shortUrl.value);
                copied = true;
                setTimeout(() => copied = false, 2000);
              "
              class="neo-copy-btn"
              :class="{ 'copied': copied }"
            >
              <span x-show="!copied">Copy</span>
              <span x-show="copied">Ter-Copy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

export const renderError = (message: string) =>
  `
    <div class="neo-card bg-red-100">
      <p class="font-bold text-red-600">Gagal: ${message}</p>
    </div>
  `;
