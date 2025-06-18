import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Spinner } from 'react-bootstrap';

// Import PDF.js
import * as pdfjsLib from 'pdfjs-dist';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Set worker source
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const dashSalesData = [
  { title: 'Yearly Sales', amount: '$8.638.32', icon: 'icon-arrow-up text-c-green', value: 70, color: 'progress-c-theme' },
  { title: 'AI Reviews', amount: '$2.942.32', icon: 'icon-arrow-down text-c-red', value: 36, class: 'progress-c-theme2' }
];

const DashDefault = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [aiReviewContent, setAiReviewContent] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Add custom CSS to hide "Powered by Flowise" text
    const style = document.createElement('style');
    style.textContent = `
      .flowise-powered-by {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    // Load the chatbot script
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
      import Chatbot from "https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js"
      Chatbot.init({
        chatflowid: "29de46a3-2f2f-4bf5-ad8d-9c6b7c24f355",
        apiHost: "https://workflows.ximplify.id",
      })
    `;
    document.body.appendChild(script);

    // Cleanup function to remove the script and style when component unmounts
    return () => {
      document.body.removeChild(script);
      document.head.removeChild(style);
    };
  }, []);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleFileUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      alert('Please select a file first.');
      return;
    }

    if (selectedFile.type !== 'application/pdf') {
      alert('Please select a PDF file.');
      return;
    }

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const pdf = await getDocument(arrayBuffer).promise;
          const numPages = pdf.numPages;
          let pdfText = '';

          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            pdfText += pageText + '\n';
          }

          console.log('Extracted PDF Text:', pdfText);

          //const flowiseUrl = 'https://workflows.ximplify.id/api/v1/prediction/0804fd86-1861-460c-afb1-c5761b646d62';
          // const flowiseUrl = 'https://workflows.ximplify.id/api/v1/prediction/e1f20939-9e16-439c-a9dc-7aa3fbbe837a';
          //const flowiseUrl = 'https://workflow.simplifygenai.id/api/v1/prediction/e1f20939-9e16-439c-a9dc-7aa3fbbe837a';
		
          //BILINGUAL
          const flowiseUrl = 'https://workflow.simplifygenai.id/api/v1/prediction/e1f20939-9e16-439c-a9dc-7aa3fbbe837a';
                
          const response = await fetch(flowiseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question: pdfText }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          console.log('Flowise Agent Response:', result);

          if (result && result.text) {
            setAiReviewContent(result.text);
          } else {
            setAiReviewContent('Could not retrieve review from agent.');
          }
        } catch (error) {
          console.error('Error processing PDF or sending to agent:', error);
          alert('Error processing PDF or sending to agent.');
        } finally {
          setIsProcessing(false);
        }
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        alert('Error reading file.');
        setIsProcessing(false);
      };

      reader.readAsArrayBuffer(selectedFile);
    } catch (error) {
      console.error('Error in file upload:', error);
      alert('Error in file upload.');
      setIsProcessing(false);
    }
  };

  const yearlySalesData = dashSalesData[0];
  const otherSalesData = dashSalesData.slice(1);

  return (
    <React.Fragment>
      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Header>
              <Card.Title as="h5">Upload Contract File</Card.Title>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleFileUpload}>
                <Form.Group controlId="formFile" className="mb-3">
                  <Form.Label>Select Contract File</Form.Label>
                  <Form.Control type="file" onChange={handleFileChange} disabled={isProcessing} />
                </Form.Group>
                <Button variant="primary" type="submit" disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      AI Processing...
                    </>
                  ) : (
                    'Upload File'
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row>
        {otherSalesData.map((data, index) => (
          <Col xl={data.title === 'AI Reviews' ? 12 : 6} xxl={data.title === 'AI Reviews' ? 12 : 6} key={index}>
            <Card>
              <Card.Body>
                <h6 className="mb-4">{data.title}</h6>
                {aiReviewContent ? (
                  <div className="ai-recommendations-content">
                    <div dangerouslySetInnerHTML={{ __html: aiReviewContent }} />
                  </div>
                ) : (
                  <div className="ai-recommendations-content">
                    <p className="m-b-0 text-muted">AI Recommendations will appear here.</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      <Row>
        <Col xl={12} xxl={12} className="text-start">
          <Button variant="success" onClick={() => console.log('Generate New Contract File clicked')}>
            Generate New Contract File
          </Button>
        </Col>
      </Row>
    </React.Fragment>
  );
};

export default DashDefault;
