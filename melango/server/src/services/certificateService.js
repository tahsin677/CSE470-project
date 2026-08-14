const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const env = require('../config/env');

const CERT_DIR = path.join(env.uploadDir, 'certificates');

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Renders an A4 landscape certificate and resolves once the file is flushed to disk.
function generateCertificatePDF({ certificateCode, studentName, courseName, teacherName, issuedAt }) {
  fs.mkdirSync(CERT_DIR, { recursive: true });

  const fileName = `certificate-${certificateCode}.pdf`;
  const filePath = path.join(CERT_DIR, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const stream = fs.createWriteStream(filePath);

    stream.on('finish', () =>
      resolve({ fileName, filePath, fileUrl: `/uploads/certificates/${fileName}` })
    );
    stream.on('error', reject);
    doc.on('error', reject);
    doc.pipe(stream);

    const { width, height } = doc.page;
    const navy = '#0f172a';
    const gold = '#c9a227';

    doc.rect(0, 0, width, height).fill('#fdfdfb');
    doc.lineWidth(10).strokeColor(navy).rect(24, 24, width - 48, height - 48).stroke();
    doc.lineWidth(2).strokeColor(gold).rect(42, 42, width - 84, height - 84).stroke();

    doc
      .fillColor(navy)
      .fontSize(42)
      .font('Helvetica-Bold')
      .text('MELANGO', 0, 80, { align: 'center', characterSpacing: 6 });

    doc
      .fillColor(gold)
      .fontSize(13)
      .font('Helvetica')
      .text('LEARNING MANAGEMENT SYSTEM', { align: 'center', characterSpacing: 3 });

    doc
      .moveDown(1.4)
      .fillColor(navy)
      .fontSize(26)
      .font('Helvetica-Bold')
      .text('Certificate of Completion', { align: 'center' });

    doc
      .moveDown(1)
      .fontSize(13)
      .font('Helvetica')
      .fillColor('#475569')
      .text('This certificate is proudly presented to', { align: 'center' });

    doc
      .moveDown(0.6)
      .fontSize(34)
      .font('Helvetica-Bold')
      .fillColor(navy)
      .text(studentName, { align: 'center' });

    const lineWidth = 320;
    const lineY = doc.y + 8;
    doc
      .moveTo((width - lineWidth) / 2, lineY)
      .lineTo((width + lineWidth) / 2, lineY)
      .lineWidth(1)
      .strokeColor(gold)
      .stroke();

    doc
      .moveDown(1.2)
      .fontSize(13)
      .font('Helvetica')
      .fillColor('#475569')
      .text('for successfully completing the course', { align: 'center' });

    doc
      .moveDown(0.5)
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor(navy)
      .text(courseName, { align: 'center' });

    const footerY = height - 140;
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#334155')
      .text(`Issued on ${formatDate(issuedAt)}`, 90, footerY, { width: 220, align: 'left' })
      .text(`Certificate ID: ${certificateCode}`, 90, footerY + 18, {
        width: 260,
        align: 'left',
      });

    doc
      .moveTo(width - 320, footerY + 14)
      .lineTo(width - 90, footerY + 14)
      .lineWidth(1)
      .strokeColor('#94a3b8')
      .stroke();

    doc
      .fontSize(11)
      .fillColor('#334155')
      .text(teacherName || 'Course Instructor', width - 320, footerY + 22, {
        width: 230,
        align: 'center',
      })
      .fontSize(9)
      .fillColor('#64748b')
      .text('Instructor', width - 320, footerY + 38, { width: 230, align: 'center' });

    doc.end();
  });
}

module.exports = { generateCertificatePDF, CERT_DIR };
