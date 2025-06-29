import React from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { Editor } from '@tinymce/tinymce-react';


import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import './contract-review-update-translation.css';

import { supabase } from '../config/supabase';


export default function ContractReviewUpdateDownload() {
  const location = useLocation();
  const { contractReviewId, selectedLanguage, translationResult, revisedContractText } = location.state || {};

  const [wysiwygValue, setWysiwygValue] = React.useState(translationResult || '');

  // Set TinyMCE value ONLY from translationResult passed from previous page
  React.useEffect(() => {
    setWysiwygValue(translationResult || '');
  }, [translationResult]);


  // Download as PDF
  const handleDownloadPDF = async () => {
    if (!translationResult) return;
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.className = 'english-preview-html-box';
    tempDiv.innerHTML = translationResult;
    // Force font size to 12pt and Times New Roman for PDF export
    const style = document.createElement('style');
    style.textContent = `* { font-size: 12pt !important; font-family: 'Times New Roman', Times, serif !important; }`;
    tempDiv.appendChild(style);
    // Set tempDiv width to match A4 printable area (159.2mm = ~602px at 96dpi)
    tempDiv.style.width = '602px';
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
    try {
      // Robust HTML-to-docx using DOMParser and imported docx
      function htmlToDocxParagraphs(html) {
        const blockTags = ["p", "div", "li", "center", "h1", "h2", "h3", "h4", "h5", "h6"];
        const parser = new window.DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const body = doc.body;
        const paragraphs = [];
        function walk(n, curRuns = [], curStyle = {}) {
          // Default style for all runs
          curStyle.font = 'Times New Roman';
          curStyle.size = 24; // 12pt (half-points)
        
          if (n.nodeType === Node.TEXT_NODE) {
            const text = n.textContent;
            if (text) curRuns.push(new TextRun({ text, ...curStyle }));
            return curRuns;
          }
          if (n.nodeType === Node.ELEMENT_NODE) {
            const tag = n.tagName.toLowerCase();
            let newStyle = { ...curStyle };
            if (tag === 'b' || tag === 'strong') newStyle.bold = true;
            if (tag === 'i' || tag === 'em') newStyle.italics = true;
            if (tag === 'u') newStyle.underline = {};
            if (tag === 'br') {
              curRuns.push(new TextRun({ break: 1 }));
              return curRuns;
            }
            if (blockTags.includes(tag)) {
              let runs = [];
              n.childNodes.forEach(child => { runs = walk(child, runs, newStyle); });
              let align = tag === 'center' ? AlignmentType.CENTER : undefined;
              paragraphs.push(new Paragraph({ children: runs, alignment: align }));
              return [];
            }
            if (tag === 'table') {
              // Table support
              let rows = [];
              n.childNodes.forEach(tr => {
                if (tr.nodeType === Node.ELEMENT_NODE && tr.tagName.toLowerCase() === 'tr') {
                  let cells = [];
                  tr.childNodes.forEach(td => {
                    if (td.nodeType === Node.ELEMENT_NODE && ['td','th'].includes(td.tagName.toLowerCase())) {
                      let cellContent = [];
                      td.childNodes.forEach(cellChild => {
                        // Each cell is a paragraph
                        let cellParas = walk(cellChild, [], newStyle);
                        cellContent = cellContent.concat(cellParas);
                      });
                      cells.push(new TableCell({ children: cellContent }));
                    }
                  });
                  rows.push(new TableRow({ children: cells }));
                }
              });
              paragraphs.push(new Table({ rows }));
              return [];
            }
            // Inline or span: recurse children
            n.childNodes.forEach(child => { curRuns = walk(child, curRuns, newStyle); });
            return curRuns;
          }
          return curRuns;
        }
        // For each block tag, start a new paragraph
        let hasBlock = false;
        Array.from(body.childNodes).forEach(node => {
          if (node.nodeType === 1 && blockTags.includes(node.tagName.toLowerCase())) hasBlock = true;
        });
        if (hasBlock) {
          Array.from(body.childNodes).forEach(node => {
            if (blockTags.includes((node.tagName||'').toLowerCase())) {
              walk(node, [], {});
            } else if (node.nodeType === 1 && node.tagName.toLowerCase() === 'table') {
              walk(node, [], {});
            }
          });
        } else {
          // fallback: treat as one paragraph, split on <br> or \n
          let html = body.innerHTML;
          html = html.replace(/<br\s*\/?>(?!$)/gi, "\n");
          html.split(/\n|\r/).forEach(line => {
            paragraphs.push(new Paragraph({ children: [new TextRun(line)] }));
          });
        }
        return paragraphs;
      }
      const docxElements = htmlToDocxParagraphs(wysiwygValue);
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch = 1440 twips
                size: { orientation: "portrait", width: 11906, height: 16838 }, // A4 in twips
              },
            },
            children: docxElements,
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
      <h4>Download Agreement</h4>
      {/* WYSIWYG Editor with TinyMCE */}
      <div style={{ marginBottom: 32 }}>
        <Editor
          apiKey="qvsglduogj8ktljwkouzx32bi9gafh1khbsxv3lg2thd86d9"
          value={wysiwygValue}
          init={{
            menubar: false,
            toolbar: false,
            readonly: 1,
            plugins: 'table',
            content_style: 'body { background: #f8fafd; border-radius: 4px; border: 1px solid #dbeafe; min-height: 200px; }',
          }}
          disabled={true}
        />
        {/* Export Edited to WORD and PDF buttons */}
        <div className="mt-3" style={{ marginBottom: 16, display: 'flex', gap: '10px' }}>
          <Button
            variant="primary"
            size="sm"
            style={{ marginLeft: '10px' }}
            onClick={async () => {
              try {
                const html = `<!DOCTYPE html><html><head><meta charset='utf-8'></head><body>${wysiwygValue}</body></html>`;
                if (!window.htmlDocx) {
                  alert('html-docx-js library not loaded! Please check your public/index.html.');
                  return;
                }
                // Inject styles for Times New Roman, 12pt, 1.15 spacing, 1 inch margins, A4
const styledHtml = `<!DOCTYPE html><html><head><meta charset='utf-8'>\n<style>body { font-family: 'Times New Roman', Times, serif !important; font-size: 12pt !important; line-height: 1.15 !important; margin: 1in !important; } p, div, td, th { font-family: 'Times New Roman', Times, serif !important; font-size: 12pt !important; line-height: 1.15 !important; } table { width: 100%; } </style></head><body>${wysiwygValue}</body></html>`;
const blob = window.htmlDocx.asBlob(styledHtml);
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'tinymce_agreement.docx';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
              } catch (err) {
                alert('Failed to generate TinyMCE Word file: ' + err.message);
              }
            }}
          >
            Download Agreement (in WORD document)
          </Button>
        </div>
      </div>

    </div>
  );
}
