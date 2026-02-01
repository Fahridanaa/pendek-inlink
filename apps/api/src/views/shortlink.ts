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

// export const renderError = (message: string) =>
//   `
//     <div class="neo-card bg-red-100">
//       <p class="font-bold text-red-600">Gagal: ${message}</p>
//     </div>
//   `;

export const renderError = (message: string = "Server Error", code: number = 500) =>
  `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Link Not Found - PendekInLink</title>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;900&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Space Grotesk', sans-serif;
            background: #f4f4f0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }
          .container {
            background: white;
            border: 4px solid black;
            box-shadow: 8px 8px 0 black;
            padding: 3rem;
            max-width: 600px;
            text-align: center;
          }
          h1 { font-size: 4rem; font-weight: 900; margin-bottom: 1rem; }
          p { font-size: 1.2rem; font-weight: 600; margin-bottom: 2rem; }
          a {
            background: #FFFF00;
            border: 4px solid black;
            box-shadow: 4px 4px 0 black;
            padding: 1rem 2rem;
            font-weight: 900;
            text-transform: uppercase;
            text-decoration: none;
            color: black;
            display: inline-block;
          }
          a:hover {
            box-shadow: 2px 2px 0 black;
            transform: translate(2px, 2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${code}</h1>
          <p>${message}</p>
          <a href="https://pendekinlink.fahridanaa.my.id">BUAT LINK BARU</a>
        </div>
      </body>
    </html>
  `;

export const renderCountdown = (url: string) =>
  `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redirecting...</title>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;900&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Space Grotesk', sans-serif;
          background: #f4f4f0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        .container {
          background: white;
          border: 4px solid black;
          box-shadow: 8px 8px 0 black;
          padding: 3rem;
          max-width: 600px;
          width: 100%;
          text-align: center;
        }
        h1 {
          font-size: 2.5rem;
          font-weight: 900;
          margin-bottom: 2rem;
        }
        .countdown {
          font-size: 5rem;
          font-weight: 900;
          color: #FFFF00;
          text-shadow: 4px 4px 0 black;
          margin: 2rem 0;
        }
        .url {
          background: #f4f4f0;
          border: 3px solid black;
          padding: 1rem;
          word-break: break-all;
          font-weight: 600;
          margin: 2rem 0;
        }
        .skip {
          background: #FFFF00;
          border: 4px solid black;
          box-shadow: 4px 4px 0 black;
          padding: 1rem 2rem;
          font-weight: 900;
          text-transform: uppercase;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          color: black;
          margin-top: 1rem;
        }
        .skip:hover {
          box-shadow: 2px 2px 0 black;
          transform: translate(2px, 2px);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Redirecting...</h1>
        <div class="countdown" id="countdown">5</div>
        <p style="font-weight: 700; margin-bottom: 1rem;">Kamu bakal diarahkan ke link berikut:</p>
        <div class="url">${url}</div>
        <a href="${url}" class="skip">SKIP</a>
      </div>

      <script>
        let count = 5;
        const countdownEl = document.getElementById('countdown');

        const interval = setInterval(() => {
          count--;
          countdownEl.textContent = count;

          if (count <= 0) {
            clearInterval(interval);
            window.location.href = "${url}";
          }
        }, 1000);
      </script>
    </body>
    </html>
  `;

export const renderRateLimitModal = (secondsLeft: number): string =>
  `
    <div id="result"></div>
    <div hx-swap-oob="beforeend:body">
      <div
        id="rate-limit-modal"
        class="fixed inset-0 flex items-center justify-center z-1 p-4"
        style="animation: fadeIn 0.2s ease"
      >
        <div class="bg-black opacity-50 absolute inset-0"></div>
        <div class="neo-card bg-red-100 max-w-md w-full">
          <h3 class="text-2xl font-black text-red-600 mb-4">SABAR WOI!</h3>
          <p class="font-bold mb-4">Terlalu banyak request! Tunggu 1 menit ya.</p>
          <div class="bg-white border-4 border-black p-4 mb-4">
            <p class="text-sm mb-2 font-bold">Reset dalam:</p>
            <p class="font-black text-5xl text-center" id="countdown-timer">${secondsLeft}s</p>
          </div>
          <button
            onclick="
              const modal = document.getElementById('rate-limit-modal');
              modal.style.animation = 'fadeOut 0.2s ease';
              setTimeout(() => modal.remove(), 200);
            "
            class="neo-btn w-full"
          >
            OKE SIAP
          </button>
        </div>
      </div>
    </div>
    <script>
      (function() {
        let secondsLeft = ${secondsLeft};
        const timer = document.getElementById('countdown-timer');
        const modal = document.getElementById('rate-limit-modal');

        const interval = setInterval(() => {
          secondsLeft--;
          if (timer) {
            timer.textContent = secondsLeft + 's';
          }

          if (secondsLeft <= 0) {
            clearInterval(interval);
            if (modal) {
              modal.style.animation = 'fadeOut 0.2s ease';
              setTimeout(() => modal.remove(), 200);
            }
          }
        }, 1000);
      })();
    </script>
    <style>
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    </style>
  `;

export const renderErrorModal = (message: string = "Server Error", code: number = 500) => `
    <div id="error-modal" class="fixed inset-0 flex items-center justify-center">
      <div class="bg-black opacity-50 absolute inset-0 z-10"></div>
      <div class="max-w-md w-full z-20">
        <div class="bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0)] p-12 max-w-lg w-full text-center">
          <h1 class="text-6xl font-bold mb-1">${code}</h1>
          <p class="text-lg font-semibold mb-2">${message}</p>
          <button
            onclick="
              const modal = document.getElementById('error-modal');
              modal.style.animation = 'fadeOut 0.2s ease';
              setTimeout(() => modal.remove(), 200);
            "
            class="neo-btn w-full"
          >
            OK
          </button>
        </div>
      </div>
    </div>
`;
