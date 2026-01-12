import { chromium, Browser } from 'playwright';
import { format } from 'date-fns';
import path from 'path';
import fs from 'fs';

const BRANDING = {
  colors: {
    primary: '#1E87F0',
    accent: '#2C88C9',
    background: '#FFFFFF',
    textPrimary: '#2C88C9',
    headerBg: '#2f2e78',
    darkBlue: '#2E3192',
  },
  fonts: {
    heading: 'Montserrat, sans-serif',
    body: 'Hind, sans-serif',
  },
};

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      args: ['--disable-dev-shm-usage', '--no-sandbox'],
    });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

process.on('SIGTERM', async () => {
  await closeBrowser();
});

process.on('SIGINT', async () => {
  await closeBrowser();
});

function getLogoBase64(): string {
  try {
    const logoPath = path.join(process.cwd(), 'attached_assets', 'logo.svg');
    if (fs.existsSync(logoPath)) {
      const logoContent = fs.readFileSync(logoPath, 'utf-8');
      return `data:image/svg+xml;base64,${Buffer.from(logoContent).toString('base64')}`;
    }
  } catch (e) {
    console.error('Failed to load logo:', e);
  }
  return '';
}

function generateBaseStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Hind:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: ${BRANDING.fonts.body};
      font-size: 11pt;
      line-height: 1.5;
      color: #333;
      background: ${BRANDING.colors.background};
    }
    
    .report-container {
      padding: 0;
      max-width: 100%;
    }
    
    .header {
      background: linear-gradient(135deg, ${BRANDING.colors.headerBg} 0%, ${BRANDING.colors.accent} 100%);
      color: white;
      padding: 30px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .header-logo {
      height: 40px;
      filter: brightness(0) invert(1);
    }
    
    .header-info {
      text-align: right;
      font-size: 10pt;
    }
    
    .header-title {
      font-family: ${BRANDING.fonts.heading};
      font-size: 24pt;
      font-weight: 600;
      margin: 0;
      letter-spacing: -0.5px;
    }
    
    .header-subtitle {
      font-size: 11pt;
      opacity: 0.9;
      margin-top: 4px;
    }
    
    .content {
      padding: 30px 40px;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-family: ${BRANDING.fonts.heading};
      font-size: 14pt;
      font-weight: 600;
      color: ${BRANDING.colors.headerBg};
      border-bottom: 2px solid ${BRANDING.colors.accent};
      padding-bottom: 8px;
      margin-bottom: 15px;
    }
    
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .metric-card {
      background: #f8fafc;
      border-radius: 8px;
      padding: 15px;
      border-left: 4px solid ${BRANDING.colors.accent};
    }
    
    .metric-value {
      font-family: ${BRANDING.fonts.heading};
      font-size: 24pt;
      font-weight: 700;
      color: ${BRANDING.colors.headerBg};
    }
    
    .metric-label {
      font-size: 9pt;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }
    
    .data-table th {
      background: ${BRANDING.colors.headerBg};
      color: white;
      font-family: ${BRANDING.fonts.heading};
      font-weight: 600;
      padding: 10px 12px;
      text-align: left;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .data-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .data-table tr:nth-child(even) {
      background: #f8fafc;
    }
    
    .data-table tr:hover {
      background: #f1f5f9;
    }
    
    .highlight-row {
      background: linear-gradient(90deg, rgba(30,135,240,0.1) 0%, transparent 100%) !important;
      font-weight: 600;
    }
    
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 8pt;
      font-weight: 600;
    }
    
    .badge-success {
      background: #dcfce7;
      color: #166534;
    }
    
    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }
    
    .badge-info {
      background: #dbeafe;
      color: #1e40af;
    }
    
    .trend-up {
      color: #16a34a;
    }
    
    .trend-down {
      color: #dc2626;
    }
    
    .footer {
      background: #f8fafc;
      padding: 20px 40px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9pt;
      color: #666;
    }
    
    .footer-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .footer-logo {
      height: 24px;
    }
    
    .confidential {
      color: ${BRANDING.colors.accent};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .page-break {
      page-break-before: always;
    }

    .summary-box {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .summary-text {
      font-size: 11pt;
      line-height: 1.6;
    }

    .insights-list {
      list-style: none;
      padding: 0;
    }

    .insights-list li {
      padding: 8px 0 8px 24px;
      position: relative;
      border-bottom: 1px solid #e2e8f0;
    }

    .insights-list li:before {
      content: "→";
      position: absolute;
      left: 0;
      color: ${BRANDING.colors.accent};
      font-weight: bold;
    }

    .insights-list li:last-child {
      border-bottom: none;
    }
  `;
}

export interface ReportMetadata {
  title: string;
  subtitle?: string;
  generatedBy: string;
  generatedAt: Date;
  reportType: string;
}

export interface SdrPerformanceData {
  name: string;
  calls: number;
  qualified: number;
  meetings: number;
  connectRate: number;
  callsChange?: number;
  qualifiedChange?: number;
}

export interface TeamSummaryData {
  totalCalls: number;
  totalQualified: number;
  totalMeetings: number;
  avgConnectRate: number;
  topPerformer: string;
  mostImproved?: string;
  sdrs: SdrPerformanceData[];
}

export interface CallAnalysisData {
  sdrName: string;
  leadName: string;
  company: string;
  duration: string;
  disposition: string;
  overallScore: number;
  strengths: string[];
  improvements: string[];
  objections: { objection: string; rebuttal: string }[];
  summary: string;
}

function generateTeamSummaryHtml(data: TeamSummaryData, metadata: ReportMetadata): string {
  const logoBase64 = getLogoBase64();
  
  const sdrRows = data.sdrs.map((sdr, index) => {
    const isTopPerformer = sdr.name === data.topPerformer;
    const isMostImproved = sdr.name === data.mostImproved;
    
    return `
      <tr class="${isTopPerformer ? 'highlight-row' : ''}">
        <td>${index + 1}</td>
        <td>
          ${sdr.name}
          ${isTopPerformer ? '<span class="badge badge-success">Top Performer</span>' : ''}
          ${isMostImproved ? '<span class="badge badge-info">Most Improved</span>' : ''}
        </td>
        <td>${sdr.calls}</td>
        <td>${sdr.qualified}</td>
        <td>${sdr.meetings}</td>
        <td>${sdr.connectRate}%</td>
        <td>
          ${sdr.callsChange !== undefined ? `
            <span class="${sdr.callsChange >= 0 ? 'trend-up' : 'trend-down'}">
              ${sdr.callsChange >= 0 ? '↑' : '↓'} ${Math.abs(sdr.callsChange)}%
            </span>
          ` : '-'}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>${generateBaseStyles()}</style>
    </head>
    <body>
      <div class="report-container">
        <div class="header">
          <div>
            ${logoBase64 ? `<img src="${logoBase64}" class="header-logo" alt="Hawk Ridge Systems">` : '<div style="font-size:18pt;font-weight:bold;">HAWK RIDGE SYSTEMS</div>'}
            <h1 class="header-title">${metadata.title}</h1>
            ${metadata.subtitle ? `<div class="header-subtitle">${metadata.subtitle}</div>` : ''}
          </div>
          <div class="header-info">
            <div><strong>Report Date:</strong> ${format(metadata.generatedAt, 'MMMM d, yyyy')}</div>
            <div><strong>Generated By:</strong> ${metadata.generatedBy}</div>
            <div><strong>Report Type:</strong> ${metadata.reportType}</div>
          </div>
        </div>
        
        <div class="content">
          <div class="section">
            <h2 class="section-title">Performance Overview</h2>
            <div class="metric-grid">
              <div class="metric-card">
                <div class="metric-value">${data.totalCalls}</div>
                <div class="metric-label">Total Calls</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${data.totalQualified}</div>
                <div class="metric-label">Qualified Leads</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${data.totalMeetings}</div>
                <div class="metric-label">Meetings Booked</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${data.avgConnectRate}%</div>
                <div class="metric-label">Avg Connect Rate</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">SDR Leaderboard</h2>
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>SDR Name</th>
                  <th>Calls</th>
                  <th>Qualified</th>
                  <th>Meetings</th>
                  <th>Connect Rate</th>
                  <th>WoW Change</th>
                </tr>
              </thead>
              <tbody>
                ${sdrRows}
              </tbody>
            </table>
          </div>

          ${data.topPerformer ? `
            <div class="section">
              <h2 class="section-title">Key Insights</h2>
              <ul class="insights-list">
                <li><strong>${data.topPerformer}</strong> leads the team with the highest qualified leads and meetings this week.</li>
                ${data.mostImproved ? `<li><strong>${data.mostImproved}</strong> showed the most improvement compared to last week.</li>` : ''}
                <li>Team average connect rate is <strong>${data.avgConnectRate}%</strong> - ${data.avgConnectRate >= 30 ? 'above' : 'below'} the industry benchmark of 30%.</li>
              </ul>
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <div class="footer-left">
            ${logoBase64 ? `<img src="${logoBase64}" class="footer-logo" alt="Hawk Ridge Systems">` : ''}
            <span>Lead Intel by Hawk Ridge Systems</span>
          </div>
          <div class="confidential">Confidential</div>
          <div>Page 1 of 1</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateCallAnalysisHtml(data: CallAnalysisData, metadata: ReportMetadata): string {
  const logoBase64 = getLogoBase64();
  
  const scoreColor = data.overallScore >= 80 ? '#16a34a' : data.overallScore >= 60 ? '#f59e0b' : '#dc2626';
  
  const strengthsHtml = data.strengths.map(s => `<li>${s}</li>`).join('');
  const improvementsHtml = data.improvements.map(i => `<li>${i}</li>`).join('');
  
  const objectionsHtml = data.objections.map(obj => `
    <tr>
      <td style="width: 40%;">${obj.objection}</td>
      <td style="width: 60%;">${obj.rebuttal}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>${generateBaseStyles()}</style>
    </head>
    <body>
      <div class="report-container">
        <div class="header">
          <div>
            ${logoBase64 ? `<img src="${logoBase64}" class="header-logo" alt="Hawk Ridge Systems">` : '<div style="font-size:18pt;font-weight:bold;">HAWK RIDGE SYSTEMS</div>'}
            <h1 class="header-title">${metadata.title}</h1>
            ${metadata.subtitle ? `<div class="header-subtitle">${metadata.subtitle}</div>` : ''}
          </div>
          <div class="header-info">
            <div><strong>Report Date:</strong> ${format(metadata.generatedAt, 'MMMM d, yyyy')}</div>
            <div><strong>Generated By:</strong> ${metadata.generatedBy}</div>
            <div><strong>Report Type:</strong> ${metadata.reportType}</div>
          </div>
        </div>
        
        <div class="content">
          <div class="section">
            <h2 class="section-title">Call Details</h2>
            <div class="metric-grid">
              <div class="metric-card">
                <div class="metric-value" style="font-size: 14pt;">${data.sdrName}</div>
                <div class="metric-label">SDR</div>
              </div>
              <div class="metric-card">
                <div class="metric-value" style="font-size: 14pt;">${data.leadName}</div>
                <div class="metric-label">Lead</div>
              </div>
              <div class="metric-card">
                <div class="metric-value" style="font-size: 14pt;">${data.company}</div>
                <div class="metric-label">Company</div>
              </div>
              <div class="metric-card">
                <div class="metric-value" style="font-size: 14pt;">${data.duration}</div>
                <div class="metric-label">Duration</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Overall Score</h2>
            <div style="display: flex; align-items: center; gap: 20px;">
              <div style="font-size: 48pt; font-weight: 700; color: ${scoreColor}; font-family: ${BRANDING.fonts.heading};">
                ${data.overallScore}
              </div>
              <div style="flex: 1;">
                <div style="background: #e2e8f0; height: 12px; border-radius: 6px; overflow: hidden;">
                  <div style="background: ${scoreColor}; width: ${data.overallScore}%; height: 100%;"></div>
                </div>
                <div style="margin-top: 8px; color: #666; font-size: 10pt;">
                  ${data.overallScore >= 80 ? 'Excellent performance - exceeds expectations' : 
                    data.overallScore >= 60 ? 'Good performance - meets expectations' : 
                    'Needs improvement - coaching recommended'}
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Call Summary</h2>
            <div class="summary-box">
              <p class="summary-text">${data.summary}</p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="section">
              <h2 class="section-title">Strengths</h2>
              <ul class="insights-list">
                ${strengthsHtml || '<li>No specific strengths identified</li>'}
              </ul>
            </div>
            <div class="section">
              <h2 class="section-title">Areas for Improvement</h2>
              <ul class="insights-list">
                ${improvementsHtml || '<li>No specific improvements identified</li>'}
              </ul>
            </div>
          </div>

          ${data.objections.length > 0 ? `
            <div class="section">
              <h2 class="section-title">Objection Handling</h2>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Objection</th>
                    <th>SDR Response</th>
                  </tr>
                </thead>
                <tbody>
                  ${objectionsHtml}
                </tbody>
              </table>
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <div class="footer-left">
            ${logoBase64 ? `<img src="${logoBase64}" class="footer-logo" alt="Hawk Ridge Systems">` : ''}
            <span>Lead Intel by Hawk Ridge Systems</span>
          </div>
          <div class="confidential">Confidential</div>
          <div>Page 1 of 1</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateSdrPerformanceHtml(sdr: SdrPerformanceData, calls: any[], metadata: ReportMetadata): string {
  const logoBase64 = getLogoBase64();
  
  const recentCallsHtml = calls.slice(0, 10).map((call, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${call.leadName || 'Unknown'}</td>
      <td>${call.company || '-'}</td>
      <td>${call.duration || '-'}</td>
      <td>
        <span class="badge ${
          call.disposition === 'meeting-booked' ? 'badge-success' :
          call.disposition === 'qualified' ? 'badge-info' :
          'badge-warning'
        }">${call.disposition || 'unknown'}</span>
      </td>
      <td>${call.score ? `${call.score}/100` : '-'}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>${generateBaseStyles()}</style>
    </head>
    <body>
      <div class="report-container">
        <div class="header">
          <div>
            ${logoBase64 ? `<img src="${logoBase64}" class="header-logo" alt="Hawk Ridge Systems">` : '<div style="font-size:18pt;font-weight:bold;">HAWK RIDGE SYSTEMS</div>'}
            <h1 class="header-title">${metadata.title}</h1>
            ${metadata.subtitle ? `<div class="header-subtitle">${metadata.subtitle}</div>` : ''}
          </div>
          <div class="header-info">
            <div><strong>Report Date:</strong> ${format(metadata.generatedAt, 'MMMM d, yyyy')}</div>
            <div><strong>Generated By:</strong> ${metadata.generatedBy}</div>
            <div><strong>Report Type:</strong> ${metadata.reportType}</div>
          </div>
        </div>
        
        <div class="content">
          <div class="section">
            <h2 class="section-title">Performance Metrics - ${sdr.name}</h2>
            <div class="metric-grid">
              <div class="metric-card">
                <div class="metric-value">${sdr.calls}</div>
                <div class="metric-label">Total Calls</div>
                ${sdr.callsChange !== undefined ? `
                  <div class="${sdr.callsChange >= 0 ? 'trend-up' : 'trend-down'}" style="font-size: 10pt; margin-top: 4px;">
                    ${sdr.callsChange >= 0 ? '↑' : '↓'} ${Math.abs(sdr.callsChange)}% vs last week
                  </div>
                ` : ''}
              </div>
              <div class="metric-card">
                <div class="metric-value">${sdr.qualified}</div>
                <div class="metric-label">Qualified Leads</div>
                ${sdr.qualifiedChange !== undefined ? `
                  <div class="${sdr.qualifiedChange >= 0 ? 'trend-up' : 'trend-down'}" style="font-size: 10pt; margin-top: 4px;">
                    ${sdr.qualifiedChange >= 0 ? '↑' : '↓'} ${Math.abs(sdr.qualifiedChange)}% vs last week
                  </div>
                ` : ''}
              </div>
              <div class="metric-card">
                <div class="metric-value">${sdr.meetings}</div>
                <div class="metric-label">Meetings Booked</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${sdr.connectRate}%</div>
                <div class="metric-label">Connect Rate</div>
              </div>
            </div>
          </div>

          ${calls.length > 0 ? `
            <div class="section">
              <h2 class="section-title">Recent Calls</h2>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Lead</th>
                    <th>Company</th>
                    <th>Duration</th>
                    <th>Outcome</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentCallsHtml}
                </tbody>
              </table>
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <div class="footer-left">
            ${logoBase64 ? `<img src="${logoBase64}" class="footer-logo" alt="Hawk Ridge Systems">` : ''}
            <span>Lead Intel by Hawk Ridge Systems</span>
          </div>
          <div class="confidential">Confidential</div>
          <div>Page 1 of 1</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function generateTeamSummaryPdf(data: TeamSummaryData, metadata: ReportMetadata): Promise<Buffer> {
  const html = generateTeamSummaryHtml(data, metadata);
  return generatePdfFromHtml(html);
}

export async function generateCallAnalysisPdf(data: CallAnalysisData, metadata: ReportMetadata): Promise<Buffer> {
  const html = generateCallAnalysisHtml(data, metadata);
  return generatePdfFromHtml(html);
}

export async function generateSdrPerformancePdf(sdr: SdrPerformanceData, calls: any[], metadata: ReportMetadata): Promise<Buffer> {
  const html = generateSdrPerformanceHtml(sdr, calls, metadata);
  return generatePdfFromHtml(html);
}

async function generatePdfFromHtml(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'screen' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
    });
    
    return pdfBuffer;
  } finally {
    await page.close();
  }
}

export { generateTeamSummaryHtml, generateCallAnalysisHtml, generateSdrPerformanceHtml };
