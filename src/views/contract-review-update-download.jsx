import React from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph } from 'docx';
import './contract-review-update-translation.css';

export default function ContractReviewUpdateDownload() {
  const location = useLocation();
  const { contractReviewId, selectedLanguage, translationResult } = location.state || {};

  // Download as PDF
  const handleDownloadPDF = async () => {
    if (!translationResult) return;
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.className = 'english-preview-html-box';
    tempDiv.innerHTML = translationResult;
    document.body.appendChild(tempDiv);
    try {
      const canvas = await html2canvas(tempDiv, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('agreement.pdf');
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    }
    document.body.removeChild(tempDiv);
  };

  // Download as Word
  const handleDownloadWord = async () => {
    if (!translationResult) return;
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = translationResult;
      const plainText = tempDiv.innerText;
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [new Paragraph(plainText)],
          },
        ],
      });
      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'agreement.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate Word file: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '32px auto', background: '#fff', borderRadius: 6, boxShadow: '0 2px 12px #0001', padding: 32 }}>
      <h4>Agreement Preview</h4>
      <div style={{ marginBottom: 12 }}>
        <strong>Review Contract ID / Chat ID:</strong> {contractReviewId || '[Not Provided]'}<br/>
        <strong>Selected Language:</strong> {selectedLanguage || '[Not Provided]'}
      </div>
      <div style={{ background: '#e6f7ff', padding: 16, borderRadius: 4, minHeight: 120, marginBottom: 32 }}
           className="english-preview-html-box"
           dangerouslySetInnerHTML={{ __html: translationResult || '<span style=\'color:#888\'>[No translation result]</span>' }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 32 }}>
        <Button variant="primary" onClick={handleDownloadPDF}>Download Agreement (PDF)</Button>
        <Button variant="secondary" onClick={handleDownloadWord}>Download Agreement (Word)</Button>
      </div>


    </div>
  );
}
