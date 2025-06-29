import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// NOTE: Make sure to add the new route in your router config if not already present.
import { Card, Button, Spinner, Alert, Accordion } from 'react-bootstrap';
import './contract-review-update-translation.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph } from 'docx';
import { supabase } from '../config/supabase';

const SIMPLIFY_API_URL_ENGLISH = 'https://workflow.simplifygenai.id/api/v1/prediction/980b3172-5a82-46dc-9d47-e918ba8e7ca1';
const SIMPLIFY_API_URL_INDONESIAN = 'https://workflow.simplifygenai.id/api/v1/prediction/9fedd98b-3570-4f95-98fe-630ab211f933';
const SIMPLIFY_API_URL_BILINGUAL = 'https://workflow.simplifygenai.id/api/v1/prediction/7f3907bf-62c7-42f7-85a7-8fe83252948e';

const ContractReviewUpdateTranslation = () => {
  // ...existing hooks and code...
  const [selectedLanguage, setSelectedLanguage] = useState('Indonesian');
  const [previewHtml, setPreviewHtml] = useState('');
  // Removed: translation and bilingualTranslation state variables

  // Unified translate handler
  const handleUnifiedTranslate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    let translated = '';
    let apiUrl = '';
    let prompt = '';
    if (selectedLanguage === 'English') {
      apiUrl = SIMPLIFY_API_URL_ENGLISH;
      prompt = `Translate this text into English but keep the HTML tags : ${revisedText}`;
    } else if (selectedLanguage === 'Indonesian') {
      apiUrl = SIMPLIFY_API_URL_INDONESIAN;
      prompt = `Translate this text into Indonesian but keep the HTML tags : ${revisedText}`;
    } else if (selectedLanguage === 'Bilingual') {
      apiUrl = SIMPLIFY_API_URL_BILINGUAL;
      prompt = `Translate the following text into Indonesian and English, and format the result into a 2-column layout: ${revisedText}. The left column should contain the Indonesian translation. The right column should contain the English version. Each row must align semantically, meaning the same sentence or clause in both languages must appear side by side.`;
    }
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt, chatId: contractReviewId })
      });
      if (!response.ok) throw new Error('Translation API error');
      const result = await response.json();
      translated = result.text || result.output || '';
      setPreviewHtml(translated);
      // Optionally update individual language states for backward compatibility
      // Removed: setTranslation and setBilingualTranslation
      if (!translated) {
        setError('No translation returned from API.');
        setLoading(false);
        return;
      }
      // Save to supabase
      let userEmail = null;
      if (location.state?.userEmail) userEmail = location.state.userEmail;
      let updateQuery = supabase
        .from('master_contract')
        .update(
          selectedLanguage === 'English' ? { revised_contract_text_english: translated } :
          selectedLanguage === 'Indonesian' ? { revised_contract_text_indonesian: translated } :
          { revised_contract_text_bilingual: translated }
        )
        .eq('contract_review_id', contractReviewId);
      if (userEmail) updateQuery = updateQuery.eq('user_email', userEmail);
      const { error: updateError, data: updateData } = await updateQuery;
      if (updateError) throw updateError;
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Translation failed');
    }
    setLoading(false);
  };

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
  const [bilingualTranslation, setBilingualTranslation] = useState('');
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

  // Translate to Bilingual function
  const handleTranslateBilingual = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      // Fetch the latest revised_contract_text from master_contract
      const { data: contractData, error: fetchError } = await supabase
        .from('master_contract')
        .select('revised_contract_text')
        .eq('contract_review_id', contractReviewId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!contractData || !contractData.revised_contract_text) {
        setError('No revised contract text found for bilingual translation.');
        setLoading(false);
        return;
      }
      const revisedContractText = contractData.revised_contract_text;
      const prompt = `Translate the following text into Indonesian and English, and format the result into a 2-column layout: ${revisedContractText}. The left column should contain the Indonesian translation. The right column should contain the English version. Each row must align semantically, meaning the same sentence or clause in both languages must appear side by side.`;
      const response = await fetch(SIMPLIFY_API_URL_BILINGUAL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt, chatId: contractReviewId })
      });
      if (!response.ok) throw new Error('Translation API error');
      const result = await response.json();
      const translated = result.text || result.output || '';
      setBilingualTranslation(translated);
      console.log('API bilingual translation result:', translated);
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
        .update({ revised_contract_text_bilingual: translated })
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


  // Translate to Indonesian function
  const handleTranslateIndonesian = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      // Fetch the latest revised_contract_text from master_contract
      const { data: contractData, error: fetchError } = await supabase
        .from('master_contract')
        .select('revised_contract_text')
        .eq('contract_review_id', contractReviewId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!contractData || !contractData.revised_contract_text) {
        setError('No revised contract text found for Indonesian translation.');
        setLoading(false);
        return;
      }
      const revisedContractText = contractData.revised_contract_text;
      const prompt = `Translate this text into Indonesian but keep the HTML tags : ${revisedContractText}`;
      const response = await fetch(SIMPLIFY_API_URL_INDONESIAN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt, chatId: contractReviewId })
      });
      if (!response.ok) throw new Error('Translation API error');
      const result = await response.json();
      const translated = result.text || result.output || '';
      setTranslation(translated);
      console.log('API Indonesian translation result:', translated);
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
        .update({ revised_contract_text_indonesian: translated })
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
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">Document successfully translated!</Alert>}
        {/*
         <Button
           variant="primary"
           onClick={handleTranslate}
           disabled={loading || !revisedText}
           style={{ marginRight: 10 }}
         >
           {loading ? <Spinner size="sm" animation="border" /> : 'Translate to English'}
         </Button>
         */}
        {/*
         <Button
           variant="warning"
           onClick={handleTranslateIndonesian}
           disabled={loading || !revisedText}
           style={{ marginRight: 10 }}
         >
           {loading ? <Spinner size="sm" animation="border" /> : 'Translate To Indonesian'}
         </Button>
         */}
        {/*
         <Button
           variant="info"
           onClick={handleTranslateBilingual}
           disabled={loading || !revisedText}
           style={{ marginRight: 10 }}
         >
           Translate to Bilingual
         </Button>
         */}
        {/*
         <Button variant="secondary" onClick={() => navigate(-1)}>
           Back
         </Button>
         */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <label htmlFor="select-language"><strong>Select Language:</strong></label>
            <select
              id="select-language"
              value={selectedLanguage}
              onChange={e => setSelectedLanguage(e.target.value)}
              style={{ minWidth: 140, padding: 4, borderRadius: 4 }}
            >
              <option value="Indonesian">Indonesian</option>
              <option value="English">English</option>
              <option value="Bilingual">Bilingual</option>
            </select>
            <Button
              variant="primary"
              style={{ marginLeft: 8 }}
              disabled={loading || !revisedText}
              onClick={handleUnifiedTranslate}
            >
              {loading ? <Spinner as="span" animation="border" size="sm" /> : 'Translate'}
            </Button>
          </div>
          <strong>Preview:</strong>
          <div
            style={{ background: '#e6f7ff', padding: 8, borderRadius: 4, maxHeight: 200, overflow: 'auto', minHeight: 60 }}
            className="english-preview-html-box"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
          {success && (
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <Button
                variant="success"
                onClick={() => {
                  const id = contractReviewId || chatId;
                  navigate('/contract-review-update-download', {
                    state: {
                      contractReviewId: id,
                      selectedLanguage,
                      translationResult: previewHtml
                    }
                  });
                }}
              >
                Next Step &gt;&gt;&gt;
              </Button>
            </div>
          )}
        </div>


        {/* Download PDF Button */}
        <div style={{ marginTop: 16 }}>
          {/*
          <Button variant="success" onClick={handleDownloadPDF} disabled={!revisedText}>
            Download Revised Agreement (PDF)
          </Button>
          */}
        </div>
        {/* Download Word Button */}
        <div style={{ marginTop: 8 }}>
          {/*
          <Button variant="primary" onClick={handleDownloadWord} disabled={!revisedText}>
            Download Revised Agreement (WORD)
          </Button>
          */}
        </div>
      </Card.Body>
    </Card>
  );
};

export default ContractReviewUpdateTranslation;
