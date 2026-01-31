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

export const renderNotFound = () =>
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
          <h1>404</h1>
          <p>Link nggak ditemukan! Mungkin salah ketik atau udah dihapus.</p>
          <a href="http://localhost:3000">BUAT LINK BARU</a>
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
