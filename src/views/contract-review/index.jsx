import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Spinner, Table, Badge } from 'react-bootstrap';

// Import PDF.js
import * as pdfjsLib from 'pdfjs-dist';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Set worker source
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const ContractReview = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [aiReviewContent, setAiReviewContent] = useState(null);

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
          const flowiseUrl = 'https://workflow.simplifygenai.id/api/v1/prediction/e1f20939-9e16-439c-a9dc-7aa3fbbe837a';
          //const flowiseUrl = 'https://genai.ximplify.id/api/v1/prediction/e1f20939-9e16-439c-a9dc-7aa3fbbe837a';

          //const flowiseUrl = 'https://workflows.ximplify.id/v2/agentcanvas/e1f20939-9e16-439c-a9dc-7aa3fbbe837a';
          //const flowiseUrl = 'https://genai.ximplify.id/v2/agentcanvas/e1f20939-9e16-439c-a9dc-7aa3fbbe837a';

          const response = await fetch(flowiseUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              question: "Please summarize this contract.",
              chatId: "session-client-side-ui", // unik per pengguna/sesi
              uploads: [
                {
                  type: "file:full",
                  name: selectedFile.name,
                  data: pdfText,  // ⚠️ pastikan sudah truncated jika panjang
                  mime: "application/pdf"
                }
              ]
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          console.log('Flowise Agent Response:', result);

          if (result && result.text) {
            // Set AI review content for display in AI Review card
            setAiReviewContent(result.text);
            
            // Add to review history with the API response
            const newReview = {
              id: reviewHistory.length + 1,
              contractName: selectedFile.name,
              reviewDate: new Date().toISOString().split('T')[0],
              status: 'Completed',
              reviewer: 'AI Assistant',
              summary: result.text.substring(0, 100) + (result.text.length > 100 ? '...' : ''),
              fullReview: result.text
            };
            setReviewHistory([newReview, ...reviewHistory]);
          } else {
            // Set error message for AI Review card
            setAiReviewContent('Could not retrieve review from agent.');
            
            // Add error entry to review history
            const errorReview = {
              id: reviewHistory.length + 1,
              contractName: selectedFile.name,
              reviewDate: new Date().toISOString().split('T')[0],
              status: 'Failed',
              reviewer: 'AI Assistant',
              summary: 'Could not retrieve review from agent.',
              fullReview: 'Error: Could not process the contract review.'
            };
            setReviewHistory([errorReview, ...reviewHistory]);
          }
        } catch (error) {
          console.error('Error processing PDF or sending to agent:', error);
          alert('Error processing PDF or sending to agent.');
          
          // Set error message for AI Review card
          setAiReviewContent('Error: Could not process the contract review.');
          
          // Add error entry to review history
          const errorReview = {
            id: reviewHistory.length + 1,
            contractName: selectedFile.name,
            reviewDate: new Date().toISOString().split('T')[0],
            status: 'Failed',
            reviewer: 'AI Assistant',
            summary: 'Review failed due to API error',
            fullReview: 'Error: Could not process the contract review.'
          };
          setReviewHistory([errorReview, ...reviewHistory]);
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <Badge bg="success">{status}</Badge>;
      case 'Pending':
        return <Badge bg="warning" text="dark">{status}</Badge>;
      case 'In Progress':
        return <Badge bg="info">{status}</Badge>;
      case 'Failed':
        return <Badge bg="danger">{status}</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <React.Fragment>
      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Header>
              <Card.Title as="h5">Contract Review System</Card.Title>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleFileUpload}>
                <Form.Group controlId="formFile" className="mb-3">
                  <Form.Label>Upload Contract for Review</Form.Label>
                  <Form.Control type="file" onChange={handleFileChange} disabled={isProcessing} />
                  <Form.Text className="text-muted">
                    Upload a PDF contract file for AI-powered review and analysis.
                  </Form.Text>
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
                      Reviewing Contract...
                    </>
                  ) : (
                    'Start Review'
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Header>
              <Card.Title as="h5">Review Data</Card.Title>
            </Card.Header>
            <Card.Body>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Contract Name</th>
                    <th>Review Date</th>
                    <th>Status</th>
                    <th>Reviewer</th>
                    <th>Summary</th>
                    <th>Full Review</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewHistory.map((review) => (
                    <tr key={review.id}>
                      <td>{review.contractName}</td>
                      <td>{review.reviewDate}</td>
                      <td>{getStatusBadge(review.status)}</td>
                      <td>{review.reviewer}</td>
                      <td>{review.summary}</td>
                      <td>
                        {review.fullReview && review.fullReview.length > 100 ? (
                          <div>
                            <div style={{ maxHeight: '100px', overflow: 'hidden' }}>
                              {review.fullReview.substring(0, 100)}...
                            </div>
                            <Button 
                              variant="link" 
                              size="sm" 
                              onClick={() => {
                                // You can implement a modal or expandable view here
                                alert(review.fullReview);
                              }}
                            >
                              View Full Review
                            </Button>
                          </div>
                        ) : (
                          <div>{review.fullReview}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Header>
              <Card.Title as="h5">AI Review</Card.Title>
            </Card.Header>
            <Card.Body>
              {aiReviewContent ? (
                <div className="ai-review-content">
                  <div dangerouslySetInnerHTML={{ __html: aiReviewContent }} />
                </div>
              ) : (
                <p className="text-muted">AI Review content will appear here after processing a contract.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </React.Fragment>
  );
};

export default ContractReview; 