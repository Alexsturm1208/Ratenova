const chromium = require("@sparticuz/chromium-min");
const puppeteer = require("puppeteer-core");

// Öffentlich gehostetes Chromium-Binary (stabil auf Netlify)
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
    // Absender
    senderName    = "",
    senderStreet  = "",
    senderZip     = "",
    senderCity    = "",
    senderEmail   = "",
    // Empfänger
    recipientName   = "",
    recipientStreet = "",
    recipientZip    = "",
    recipientCity   = "",
    // Brief
    date    = new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }),
    subject = "",
    salutation = "Sehr geehrte Damen und Herren,",
    body    = "",
    closing = "",
    signatureName = senderName,
  } = payload;

  // Absender-Zeile (kleine Schrift über Empfänger – DIN 5008)
  const senderLine = [senderName, senderStreet, `${senderZip} ${senderCity}`]
    .filter(Boolean).join(" · ");

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

  /* ── Absenderzeile (Rücksendeadresse) ── */
  .return-address {
    font-size: 7.5pt;
    color: #888;
    border-bottom: 1px solid #ccc;
    padding-bottom: 3px;
    margin-bottom: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Absenderblock (oben links) ── */
  .sender-block {
    margin-bottom: 0;
  }
  .sender-block .sender-name {
    font-size: 11.5pt;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .sender-block .sender-addr {
    font-size: 10pt;
    line-height: 1.5;
    color: #222;
  }
  .sender-block .sender-email {
    font-size: 9.5pt;
    color: #444;
    margin-top: 3px;
  }

  /* ── Datum ── */
  .date-block {
    text-align: right;
    font-size: 10pt;
    color: #333;
    /* DIN 5008: Datum auf Höhe von ca. 72mm von Oberkante Papier */
    position: absolute;
    top: 0;
    right: 0;
  }

  /* ── Wrapper für Absender + Datum nebeneinander ── */
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1.5px solid #1a1a1a;
    padding-bottom: 12px;
    margin-bottom: 0;
    position: relative;
  }

  /* ── Empfängerfeld – DIN 5008: Anschriftfeld beginnt bei ~45mm vom Papierrand ── */
  .recipient-block {
    margin-top: 8mm;
    margin-bottom: 0;
    min-height: 40mm;
    font-size: 10.5pt;
    line-height: 1.65;
  }
  .recipient-block strong {
    font-size: 11pt;
    font-weight: 700;
  }

  /* ── Betreff ── */
  .subject-block {
    margin-top: 14mm; /* DIN 5008: mind. 10–12mm Abstand nach Empfänger */
    margin-bottom: 6mm;
    font-size: 11pt;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  /* ── Brieftext ── */
  .salutation {
    margin-bottom: 12px;
    font-size: 10.5pt;
  }
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

  /* ── Grußformel + Unterschrift ── */
  .sign-off {
    margin-bottom: 14mm; /* Platz für handschriftliche Unterschrift */
    font-size: 10.5pt;
  }
  .sig-line {
    border-top: 1px solid #1a1a1a;
    width: 52mm;
    margin-bottom: 3px;
  }
  .sig-name {
    font-weight: 700;
    font-size: 10.5pt;
  }
  .sig-addr {
    font-size: 9pt;
    color: #555;
    margin-top: 2px;
  }
</style>
</head>
<body>

<div class="header-row">
  <div class="sender-block">
    <div class="return-address">${senderLine}</div>
    <div class="sender-name">${senderName}</div>
    <div class="sender-addr">
      ${senderStreet}<br>
      ${senderZip} ${senderCity}
    </div>
    ${senderEmail ? `<div class="sender-email">${senderEmail}</div>` : ""}
  </div>
  <div class="date-block">${senderCity ? senderCity + ", " : ""}${date}</div>
</div>

<div class="recipient-block">
  <strong>${recipientName}</strong><br>
  ${recipientStreet ? recipientStreet + "<br>" : ""}
  ${recipientZip} ${recipientCity}
</div>

<div class="subject-block">Betreff: ${subject}</div>

<p class="salutation">${salutation}</p>

<div class="body-text">${body}</div>

${closing ? `<div class="closing-text">${closing}</div>` : ""}

<p class="sign-off">Mit freundlichen Grüßen</p>

<div class="sig-line"></div>
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
