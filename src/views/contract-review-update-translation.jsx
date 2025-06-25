import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Button, Spinner, Alert, Accordion } from 'react-bootstrap';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph } from 'docx';
import { supabase } from '../config/supabase';

const SIMPLIFY_API_URL_ENGLISH = 'https://workflow.simplifygenai.id/api/v1/prediction/980b3172-5a82-46dc-9d47-e918ba8e7ca1';

const ContractReviewUpdateTranslation = () => {
  // ...existing hooks and code...

  // Word Download handler
  const handleDownloadWord = async () => {
    if (!revisedText) return;
    try {
      // Convert HTML to plain text (simple approach)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = revisedText;
      const plainText = tempDiv.innerText;
      // Create docx
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
      link.download = 'revised_agreement.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate Word file: ' + err.message);
    }
  };




  // PDF Download handler
  const handleDownloadPDF = async () => {
    if (!revisedText) return;
    // Create a temporary DOM node to render HTML
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.innerHTML = revisedText;
    document.body.appendChild(tempDiv);
    try {
      const canvas = await html2canvas(tempDiv, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('revised_agreement.pdf');
    } catch (err) {
      alert('Failed to generate PDF: ' + err.message);
    }
    document.body.removeChild(tempDiv);
  };

  const location = useLocation();
  const navigate = useNavigate();
  // Try to get contractReviewId or chatId from state
  const contractReviewId = location.state?.contractReviewId || location.state?.chatId;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [revisedText, setRevisedText] = useState('');
  const [translation, setTranslation] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch revised_contract_text on mount
  useEffect(() => {
    const fetchRevisedText = async () => {
      setLoading(true);
      setError(null);
      setSuccess(false);
      setTranslation('');
      try {
        const { data, error } = await supabase
          .from('master_contract')
          .select('revised_contract_text')
          .eq('contract_review_id', contractReviewId)
          .maybeSingle();
        if (error) throw error;
        if (!data || !data.revised_contract_text) {
          setError('No revised contract text found.');
          setLoading(false);
          return;
        }
        setRevisedText(data.revised_contract_text);
      } catch (err) {
        setError(err.message || 'Failed to fetch contract.');
      }
      setLoading(false);
    };
    if (contractReviewId) fetchRevisedText();
  }, [contractReviewId]);

  // Translate function
  const handleTranslate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const prompt = `Translate this text into English but keep the HTML tags : ${revisedText}`;
      const response = await fetch(SIMPLIFY_API_URL_ENGLISH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt, chatId: contractReviewId })
      });
      if (!response.ok) throw new Error('Translation API error');
      const result = await response.json();
      const translated = result.text || result.output || '';
      setTranslation(translated);
      console.log('API translation result:', translated);
      if (!translated) {
        setError('No translation returned from API.');
        setLoading(false);
        return;
      }
      // Get user_email for more robust update
      let userEmail = null;
      if (location.state?.userEmail) userEmail = location.state.userEmail;
      // Save to supabase
      let updateQuery = supabase
        .from('master_contract')
        .update({ revised_contract_text_english: translated })
        .eq('contract_review_id', contractReviewId);
      if (userEmail) updateQuery = updateQuery.eq('user_email', userEmail);
      const { error: updateError, data: updateData } = await updateQuery;
      console.log('Supabase update result:', updateData, updateError);
      if (updateError) throw updateError;
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Translation failed');
    }
    setLoading(false);
  };

  return (
    <Card className="mt-5 mx-auto" style={{ maxWidth: 600 }}>
      <Card.Header>
        <Card.Title as="h4">Document Translation</Card.Title>
      </Card.Header>
      <Card.Body>
        <p>
          <strong>Review Contract ID / Chat ID:</strong> {contractReviewId || <span style={{color:'red'}}>Not provided</span>}
        </p>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">Translation saved to database!</Alert>}
        <div style={{ marginBottom: 16 }}>
          <strong>Original (revised_contract_text):</strong>
          <pre style={{ background: '#f3f3f3', padding: 8, borderRadius: 4, maxHeight: 200, overflow: 'auto' }}>{revisedText || '[No text]'}
          </pre>
        </div>
        <Button
          variant="primary"
          onClick={handleTranslate}
          disabled={loading || !revisedText}
          style={{ marginRight: 10 }}
        >
          {loading ? <Spinner size="sm" animation="border" /> : 'Translate to English'}
        </Button>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Back
        </Button>
        {translation && (
          <div style={{ marginTop: 24 }}>
            <strong>Translation Result:</strong>
            <pre style={{ background: '#e6f7ff', padding: 8, borderRadius: 4, maxHeight: 200, overflow: 'auto' }}>{translation}</pre>
          </div>
        )}

        {/* Collapsible Indonesian Preview */}
        <div style={{ marginTop: 24 }}>
          <Accordion>
            <Accordion.Item eventKey="0">
              <Accordion.Header>Translated Preview : Indonesian</Accordion.Header>
              <Accordion.Body>
                <div>
                  <strong>Preview:</strong>
                  {revisedText ? (
                    <div style={{ background: '#f9f9f9', padding: 8, borderRadius: 4, minHeight: 60 }}
                         dangerouslySetInnerHTML={{ __html: revisedText }} />
                  ) : (
                    <span style={{ color: '#888' }}>[No Indonesian translation available]</span>
                  )}
                </div>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </div>

        {/* Download PDF Button */}
        <div style={{ marginTop: 16 }}>
          <Button variant="success" onClick={handleDownloadPDF} disabled={!revisedText}>
            Download Revised Agreement (PDF)
          </Button>
        </div>
        {/* Download Word Button */}
        <div style={{ marginTop: 8 }}>
          <Button variant="primary" onClick={handleDownloadWord} disabled={!revisedText}>
            Download Revised Agreement (WORD)
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ContractReviewUpdateTranslation;
