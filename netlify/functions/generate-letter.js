const chromium = require("@sparticuz/chromium-min");
const puppeteer = require("puppeteer-core");

const CHROMIUM_REMOTE_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v119.0.2/chromium-v119.0.2-pack.tar";

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

  const {
    senderName    = "",
    senderStreet  = "",
    senderZip     = "",
    senderCity    = "",
    senderEmail   = "",
    recipientName   = "",
    recipientStreet = "",
    recipientZip    = "",
    recipientCity   = "",
    date    = new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }),
    subject = "",
    salutation = "Sehr geehrte Damen und Herren,",
    body    = "",
    closing = "",
    signatureName = senderName,
    signatureImage = "",
  } = payload;

  const senderLine = [senderName, senderStreet, `${senderZip} ${senderCity}`]
    .filter(Boolean).join(" · ");

  // Zahlungsblock: Leerzeichen-Tabs durch HTML-Tabelle ersetzen
  // Zeilen die mit 4+ Leerzeichen beginnen werden als Tabellen-Zeilen erkannt
  function formatBody(raw) {
    if (!raw) return "";
    const lines = raw.split("\n");
    let result = [];
    let tableLines = [];
    let inTable = false;

    const flushTable = () => {
      if (tableLines.length === 0) return;
      result.push('<table class="data-table">');
      for (const line of tableLines) {
        // Trenne bei 2+ Leerzeichen
        const match = line.trim().match(/^(.+?)\s{2,}(.+)$/);
        if (match) {
          result.push(`<tr><td class="dt-label">${match[1]}</td><td class="dt-value">${match[2]}</td></tr>`);
        } else {
          result.push(`<tr><td class="dt-label" colspan="2">${line.trim()}</td></tr>`);
        }
      }
      result.push("</table>");
      tableLines = [];
      inTable = false;
    };

    for (const line of lines) {
      const isTableLine = /^ {4}/.test(line) && line.trim().length > 0;
      if (isTableLine) {
        inTable = true;
        tableLines.push(line);
      } else {
        if (inTable) flushTable();
        result.push(line);
      }
    }
    if (inTable) flushTable();

    // Verbleibenden Text als pre-wrap rendern (ohne Tabellen-Zeilen)
    return result.join("\n");
  }

  const formattedBody = formatBody(body);

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: A4;
    margin: 20mm 22mm 20mm 25mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5pt;
    line-height: 1.45;
    color: #1a1a1a;
    background: #fff;
  }

  /* ── Gesamtlayout: Anschriftzone oben ── */
  .letter-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0;
  }

  /* ── Linke Seite: nur Absender ── */
  .sender-zone {
    width: 85mm;
  }

  /* Rücksendeadresse: direkt über Empfängerblock (DIN 5008 Anschriftfeld) */
  .return-address {
    font-size: 7pt;
    color: #888;
    border-bottom: 1px solid #bbb;
    padding-bottom: 2px;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    height: 5mm;
    line-height: 5mm;
  }

  /* Absenderblock oben links */
  .sender-block .sender-name {
    font-size: 11pt;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .sender-block .sender-addr {
    font-size: 10pt;
    line-height: 1.6;
    color: #222;
  }
  .sender-block .sender-email {
    font-size: 9.5pt;
    color: #555;
    margin-top: 3px;
  }

  /* ── Datum rechts ── */
  .date-block {
    text-align: right;
    font-size: 10pt;
    color: #333;
    padding-top: 10mm; /* DIN 5008: Datum auf ~72mm vom Oberkante */
  }

  /* ── Trennlinie unter Absender/Datum ── */
  .header-rule {
    border: none;
    border-top: 1.5px solid #1a1a1a;
    margin: 5mm 0 0 0;
  }

  /* ── Empfängerfeld ── */
  .recipient-block {
    margin-top: 8mm;
    min-height: 27mm;
    font-size: 10.5pt;
    line-height: 1.65;
  }
  .recipient-block strong {
    font-size: 11pt;
    font-weight: 700;
  }

  /* ── Betreff ── */
  .subject-block {
    margin-top: 14mm;
    margin-bottom: 6mm;
    font-size: 11pt;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  /* ── Brieftext ── */
  .salutation { margin-bottom: 12px; font-size: 10.5pt; }
  .body-text {
    white-space: pre-wrap;
    text-align: justify;
    margin-bottom: 14px;
    font-size: 10.5pt;
    line-height: 1.55;
  }
  .closing-text {
    text-align: justify;
    margin-bottom: 10mm;
    font-size: 10.5pt;
    line-height: 1.55;
  }

  /* ── Datentabelle (Zahlungsblock etc.) ── */
  .data-table {
    border-collapse: collapse;
    margin: 10px 0 10px 8mm;
    font-size: 10.5pt;
    line-height: 1.7;
  }
  .data-table .dt-label {
    color: #333;
    padding-right: 12mm;
    vertical-align: top;
    white-space: nowrap;
  }
  .data-table .dt-value {
    font-weight: 500;
    vertical-align: top;
  }

  /* ── Unterschrift ── */
  .sign-off { margin-bottom: 14mm; font-size: 10.5pt; }
  .sig-line { border-top: 1px solid #1a1a1a; width: 52mm; margin-bottom: 3px; }
  .sig-name { font-weight: 700; font-size: 10.5pt; }
  .sig-addr { font-size: 9pt; color: #555; margin-top: 2px; }
</style>
</head>
<body>

<div class="letter-top">
  <div class="sender-zone">
    <div class="sender-block">
      <div class="sender-name">${senderName}</div>
      <div class="sender-addr">
        ${senderStreet}<br>
        ${senderZip} ${senderCity}
      </div>
      ${senderEmail ? `<div class="sender-email">${senderEmail}</div>` : ""}
    </div>
  </div>
  <div class="date-block">${senderCity ? senderCity + ", " : ""}${date}</div>
</div>

<hr class="header-rule">

<div class="recipient-block">
  <div class="return-address">${senderLine}</div>
  <strong>${recipientName}</strong><br>
  ${recipientStreet ? recipientStreet + "<br>" : ""}
  ${recipientZip} ${recipientCity}
</div>

<div class="subject-block">Betreff: ${subject}</div>

<p class="salutation">${salutation}</p>

<div class="body-text">${formattedBody}</div>

${closing ? `<div class="closing-text">${closing}</div>` : ""}

<p class="sign-off">Mit freundlichen Grüßen</p>

${signatureImage ? `<img src="${signatureImage}" style="height:52px;max-width:200px;display:block;margin-bottom:6px;object-fit:contain;object-position:left">` : '<div class="sig-line"></div>'}
<div class="sig-name">${signatureName}</div>
<div class="sig-addr">${senderStreet}, ${senderZip} ${senderCity}</div>

</body>
</html>`;

  let browser;
  try {
    const executablePath = await chromium.executablePath(CHROMIUM_REMOTE_URL);

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 794, height: 1123 },
      executablePath,
      headless: "new",
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
        "Content-Disposition": `inline; filename="${encodeURIComponent(subject || "Brief")}.pdf"`,
      },
      body: pdfBuffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error("PDF generation error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  } finally {
    if (browser) await browser.close();
  }
};
