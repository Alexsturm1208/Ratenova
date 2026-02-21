/**
 * Netlify Function: generate-letter.js
 * - Generates a DIN A4 / DIN5008-ish business letter PDF
 * - Uses puppeteer-core + @sparticuz/chromium (works on Netlify)
 * - Returns inline PDF so browser opens the PDF viewer
 *
 * Expected JSON payload (all optional):
 *  senderName, senderStreet, senderZip, senderCity, senderEmail
 *  recipientName, recipientStreet, recipientZip, recipientCity
 *  place (e.g. "Ketsch"), letterDate (e.g. "21. Februar 2026")
 *  subjectLine
 *  bodyText (plain text with \n line breaks)
 *  plan: {
 *    totalAmount, monthlyRate, duration,
 *    paymentStart, paymentMethod, receiverIban, receiverBic, purpose
 *  }
 *
 * Backward-friendly: also accepts flat fields:
 *  totalAmount, monthlyRate, duration, paymentStart, paymentMethod, receiverIban, receiverBic, purpose
 */

const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeSpaces(str = "") {
  return String(str).replace(/\s+/g, " ").trim();
}

function formatIban(iban = "") {
  const raw = String(iban).replace(/\s+/g, "").toUpperCase();
  // group into blocks of 4 for readability
  return raw.replace(/(.{4})/g, "$1 ").trim();
}

function toHtmlWithBreaks(text = "") {
  // keep paragraphs readable
  const safe = escapeHtml(text);
  return safe
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => (line.trim() === "" ? "<br>" : `${line}<br>`))
    .join("");
}

function pick(payload, key, fallback = "") {
  // allows undefined/null -> fallback
  const v = payload && Object.prototype.hasOwnProperty.call(payload, key) ? payload[key] : undefined;
  return v === undefined || v === null ? fallback : v;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  // Sender
  const senderName = normalizeSpaces(pick(payload, "senderName", ""));
  const senderStreet = normalizeSpaces(pick(payload, "senderStreet", ""));
  const senderZip = normalizeSpaces(pick(payload, "senderZip", ""));
  const senderCity = normalizeSpaces(pick(payload, "senderCity", ""));
  const senderEmail = normalizeSpaces(pick(payload, "senderEmail", ""));

  // Recipient
  const recipientName = normalizeSpaces(pick(payload, "recipientName", ""));
  const recipientStreet = normalizeSpaces(pick(payload, "recipientStreet", ""));
  const recipientZip = normalizeSpaces(pick(payload, "recipientZip", ""));
  const recipientCity = normalizeSpaces(pick(payload, "recipientCity", ""));

  // Meta
  const place = normalizeSpaces(pick(payload, "place", senderCity || ""));
  const letterDate = normalizeSpaces(pick(payload, "letterDate", ""));
  const subjectLine = normalizeSpaces(pick(payload, "subjectLine", "Betreff"));
  const bodyText = pick(payload, "bodyText", "");

  // Plan (support nested plan or flat)
  const plan = payload.plan || {};
  const totalAmount = normalizeSpaces(pick(plan, "totalAmount", pick(payload, "totalAmount", "")));
  const monthlyRate = normalizeSpaces(pick(plan, "monthlyRate", pick(payload, "monthlyRate", "")));
  const duration = normalizeSpaces(pick(plan, "duration", pick(payload, "duration", "")));
  const paymentStart = normalizeSpaces(pick(plan, "paymentStart", pick(payload, "paymentStart", "")));
  const paymentMethod = normalizeSpaces(pick(plan, "paymentMethod", pick(payload, "paymentMethod", "")));
  const receiverIbanRaw = normalizeSpaces(pick(plan, "receiverIban", pick(payload, "receiverIban", "")));
  const receiverBic = normalizeSpaces(pick(plan, "receiverBic", pick(payload, "receiverBic", "")));
  const purpose = normalizeSpaces(pick(plan, "purpose", pick(payload, "purpose", "")));

  const senderZipCity = normalizeSpaces([senderZip, senderCity].filter(Boolean).join(" "));
  const recipientZipCity = normalizeSpaces([recipientZip, recipientCity].filter(Boolean).join(" "));

  // Return-address line (one line above recipient)
  const returnAddressLine = normalizeSpaces(
    [senderName, senderStreet, senderZipCity].filter(Boolean).join(" · ")
  );

  // Right date line
  const rightDateLine = normalizeSpaces(
    [place, letterDate].filter(Boolean).join(", ")
  );

  const receiverIban = formatIban(receiverIbanRaw);

  const hasPlanBox =
    !!totalAmount ||
    !!monthlyRate ||
    !!duration ||
    !!paymentStart ||
    !!paymentMethod ||
    !!receiverIbanRaw ||
    !!receiverBic ||
    !!purpose;

  // HTML (DIN A4, stable mm layout)
  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subjectLine)}</title>
<style>
  /* --- Page --- */
  @page { size: A4; margin: 20mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11.5pt;
    line-height: 1.45;
    color: #111;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Layout container */
  .page { width: 170mm; } /* A4 (210) - margins (20+20) = 170mm content width */

  /* Header: left sender block + right date */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 6mm;
    border-bottom: 0.4mm solid #111;
  }
  .sender-block .name { font-weight: 700; font-size: 13pt; margin-bottom: 1mm; }
  .sender-block .line { margin: 0.3mm 0; }
  .sender-block .meta { margin-top: 2mm; font-size: 10pt; color: #333; }

  .date-block { text-align: right; font-size: 12pt; font-weight: 400; }

  /* Recipient window block area (DIN5008-ish) */
  .recipient-area {
    margin-top: 12mm;  /* distance after header */
  }
  .return-address {
    font-size: 8.5pt;
    color: #666;
    margin-bottom: 2mm; /* IMPORTANT: directly above recipient address */
  }
  .recipient-block {
    font-size: 11pt;
    line-height: 1.65;
    margin-bottom: 8mm; /* space between recipient and subject */
  }
  .recipient-block strong { font-size: 12pt; }

  /* Subject */
  .subject-block {
    font-weight: 700;
    font-size: 12pt;
    margin: 0 0 6mm 0;
  }

  /* Body */
  .body { margin-top: 0; }

  /* Plan box (table-based, stable alignment) */
  .plan-box {
    border: 0.5mm solid #111;
    padding: 6mm;
    margin: 8mm 0 6mm 0;
    font-size: 10.5pt;
  }
  .plan-title {
    font-weight: 700;
    margin: 0 0 4mm 0;
    font-size: 11pt;
  }
  .plan-table {
    width: 100%;
    border-collapse: collapse;
  }
  .plan-table td {
    padding: 0;
    vertical-align: top;
  }
  .plan-table td:first-child {
    width: 62%;
    padding-right: 10mm;
  }
  .plan-table td.v {
    width: 38%;
    text-align: right;
    white-space: nowrap;
    font-weight: 500;
  }
  .mono {
    font-family: "Courier New", Courier, monospace;
    letter-spacing: 0.2px;
  }

  /* Closing / signature */
  .closing { margin-top: 8mm; }
  .signature { margin-top: 10mm; }

</style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="sender-block">
        <div class="name">${escapeHtml(senderName)}</div>
        <div class="line">${escapeHtml(senderStreet)}</div>
        <div class="line">${escapeHtml(senderZipCity)}</div>
        ${senderEmail ? `<div class="meta">${escapeHtml(senderEmail)}</div>` : ``}
      </div>
      <div class="date-block">${escapeHtml(rightDateLine)}</div>
    </div>

    <div class="recipient-area">
      ${returnAddressLine ? `<div class="return-address">${escapeHtml(returnAddressLine)}</div>` : ``}

      <div class="recipient-block">
        ${recipientName ? `<strong>${escapeHtml(recipientName)}</strong><br>` : ``}
        ${recipientStreet ? `${escapeHtml(recipientStreet)}<br>` : ``}
        ${recipientZipCity ? `${escapeHtml(recipientZipCity)}` : ``}
      </div>
    </div>

    <div class="subject-block">Betreff: ${escapeHtml(subjectLine)}</div>

    <div class="body">
      ${toHtmlWithBreaks(bodyText)}
    </div>

    ${
      hasPlanBox
        ? `<div class="plan-box">
            <div class="plan-title">Zahlungsdetails</div>
            <table class="plan-table">
              ${totalAmount ? `<tr><td>Offene Gesamtforderung:</td><td class="v">${escapeHtml(totalAmount)}</td></tr>` : ``}
              ${monthlyRate ? `<tr><td>Vorgeschlagene Monatsrate:</td><td class="v">${escapeHtml(monthlyRate)}</td></tr>` : ``}
              ${duration ? `<tr><td>Voraussichtliche Laufzeit:</td><td class="v">${escapeHtml(duration)}</td></tr>` : ``}
              ${paymentStart ? `<tr><td>Zahlungsbeginn:</td><td class="v">${escapeHtml(paymentStart)}</td></tr>` : ``}
              ${paymentMethod ? `<tr><td>Zahlungsweg:</td><td class="v">${escapeHtml(paymentMethod)}</td></tr>` : ``}
              ${receiverIbanRaw ? `<tr><td>Empfänger-IBAN:</td><td class="v mono">${escapeHtml(receiverIban)}</td></tr>` : ``}
              ${receiverBic ? `<tr><td>BIC:</td><td class="v mono">${escapeHtml(receiverBic)}</td></tr>` : ``}
              ${purpose ? `<tr><td>Verwendungszweck:</td><td class="v">${escapeHtml(purpose)}</td></tr>` : ``}
            </table>
          </div>`
        : ``
    }

    <div class="closing">
      ${escapeHtml(pick(payload, "closingText", ""))}
    </div>

    <div class="signature">
      Mit freundlichen Grüßen<br><br><br>
      ${escapeHtml(senderName)}
    </div>
  </div>
</body>
</html>`;

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="ratenova-brief.pdf"',
        "Cache-Control": "no-store",
      },
      body: pdfBuffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: `PDF generation failed: ${String(err && err.message ? err.message : err)}`,
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }
  }
};
