import React, { useState, useContext } from 'react';
import { Row, Col, Card, Table, Tabs, Tab, Form, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

import avatar1 from '../../assets/images/user/avatar-1.jpg';
import avatar2 from '../../assets/images/user/avatar-2.jpg';
import avatar3 from '../../assets/images/user/avatar-3.jpg';

// Import PDF.js
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
// Import PDF.js worker using Vite's asset handling
import pdfjsWorkerURL from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerURL;

const dashSalesData = [
  { title: 'Yearly Sales', amount: '$8.638.32', icon: 'icon-arrow-up text-c-green', value: 70, color: 'progress-c-theme' },
  { title: 'AI Reviews', amount: '$2.942.32', icon: 'icon-arrow-down text-c-red', value: 36, class: 'progress-c-theme2' }
];

const DashDefault = () => {
  const tabContent = (
    <React.Fragment>
      <div className="d-flex friendlist-box align-items-center justify-content-center m-b-20">
        <div className="m-r-10 photo-table flex-shrink-0">
          <Link to="#">
            <img className="rounded-circle" style={{ width: '40px' }} src={avatar1} alt="activity-user" />
          </Link>
        </div>
        <div className="flex-grow-1 ms-3">
          <h6 className="m-0 d-inline">Silje Larsen</h6>
          <span className="float-end d-flex  align-items-center">
            <i className="fa fa-caret-up f-22 m-r-10 text-c-green" />
            3784
          </span>
        </div>
      </div>
      <div className="d-flex friendlist-box align-items-center justify-content-center m-b-20">
        <div className="m-r-10 photo-table flex-shrink-0">
          <Link to="#">
            <img className="rounded-circle" style={{ width: '40px' }} src={avatar2} alt="activity-user" />
          </Link>
        </div>
        <div className="flex-grow-1 ms-3">
          <h6 className="m-0 d-inline">Julie Vad</h6>
          <span className="float-end d-flex  align-items-center">
            <i className="fa fa-caret-up f-22 m-r-10 text-c-green" />
            3544
          </span>
        </div>
      </div>
      <div className="d-flex friendlist-box align-items-center justify-content-center m-b-20">
        <div className="m-r-10 photo-table flex-shrink-0">
          <Link to="#">
            <img className="rounded-circle" style={{ width: '40px' }} src={avatar3} alt="activity-user" />
          </Link>
        </div>
        <div className="flex-grow-1 ms-3">
          <h6 className="m-0 d-inline">Storm Hanse</h6>
          <span className="float-end d-flex  align-items-center">
            <i className="fa fa-caret-down f-22 m-r-10 text-c-red" />
            2739
          </span>
        </div>
      </div>
      <div className="d-flex friendlist-box align-items-center justify-content-center m-b-20">
        <div className="m-r-10 photo-table flex-shrink-0">
          <Link to="#">
            <img className="rounded-circle" style={{ width: '40px' }} src={avatar1} alt="activity-user" />
          </Link>
        </div>
        <div className="flex-grow-1 ms-3">
          <h6 className="m-0 d-inline">Frida Thomse</h6>
          <span className="float-end d-flex  align-items-center">
            <i className="fa fa-caret-down f-22 m-r-10 text-c-red" />
            1032
          </span>
        </div>
      </div>
      <div className="d-flex friendlist-box align-items-center justify-content-center m-b-20">
        <div className="m-r-10 photo-table flex-shrink-0">
          <Link to="#">
            <img className="rounded-circle" style={{ width: '40px' }} src={avatar2} alt="activity-user" />
          </Link>
        </div>
        <div className="flex-grow-1 ms-3">
          <h6 className="m-0 d-inline">Silje Larsen</h6>
          <span className="float-end d-flex  align-items-center">
            <i className="fa fa-caret-up f-22 m-r-10 text-c-green" />
            8750
          </span>
        </div>
      </div>
      <div className="d-flex friendlist-box align-items-center justify-content-center">
        <div className="m-r-10 photo-table flex-shrink-0">
          <Link to="#">
            <img className="rounded-circle" style={{ width: '40px' }} src={avatar3} alt="activity-user" />
          </Link>
        </div>
        <div className="flex-grow-1 ms-3">
          <h6 className="m-0 d-inline">Storm Hanse</h6>
          <span className="float-end d-flex  align-items-center">
            <i className="fa fa-caret-down f-22 m-r-10 text-c-red" />
            8750
          </span>
        </div>
      </div>
    </React.Fragment>
  );

  const [selectedFile, setSelectedFile] = useState(null);
  const [aiReviewContent, setAiReviewContent] = useState(null);

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

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target.result;
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const numPages = pdf.numPages;
        let pdfText = '';

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          pdfText += pageText + '\n';
        }

        console.log('Extracted PDF Text:', pdfText);

        // Send extracted text to Flowise agent
        //const flowiseUrl = 'http://20.42.21.17:3000/api/v1/prediction/4f95af5d-0bf5-477a-9e8a-846878aa6be7';
        //const flowiseUrl = 'http://20.42.21.17/api/v1/prediction/4f95af5d-0bf5-477a-9e8a-846878aa6be7';
        const flowiseUrl = 'https://workflows.ximplify.id/api/v1/prediction/0804fd86-1861-460c-afb1-c5761b646d62';
        
        const response = await fetch(flowiseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ question: pdfText }), // Assuming the agent expects input under the key 'question'
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Flowise Agent Response:', result);

        // Assuming the Flowise agent returns the review text in a 'text' key
        if (result && result.text) {
            setAiReviewContent(result.text);
        } else {
            setAiReviewContent('Could not retrieve review from agent.');
        }

        alert('File uploaded and sent to agent. Check console and AI Reviews card for response.');

      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        alert('Error reading file.');
      };

      reader.readAsArrayBuffer(selectedFile);

    } catch (error) {
      console.error('Error processing PDF or sending to agent:', error);
      alert('Error processing PDF or sending to agent.');
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
                  <Form.Control type="file" onChange={handleFileChange} />
                </Form.Group>
                <Button variant="primary" type="submit">
                  Upload File
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row>
        {otherSalesData.map((data, index) => {
          return (
            <Col key={index} xl={data.title === 'AI Reviews' ? 12 : 6} xxl={data.title === 'AI Reviews' ? 12 : 6}>
              <Card>
                <Card.Header>
                  <Card.Title as="h5">{data.title}</Card.Title>
                </Card.Header>
                <Card.Body>
                  {data.title !== 'AI Reviews' && data.title !== 'AI Recommendations' ? (
                    <>
                      <div className="row d-flex align-items-center">
                        <div className="col-9">
                          <h3 className="f-w-300 d-flex align-items-center m-b-0">
                            <i className={`feather ${data.icon} f-30 m-r-5`} /> {data.amount}
                          </h3>
                        </div>
                        <div className="col-3 text-end">
                          <p className="m-b-0">{data.value}%</p>
                        </div>
                      </div>
                      <div className="progress m-t-30" style={{ height: '7px' }}>
                        <div
                          className={`progress-bar ${data.class}`}
                          role="progressbar"
                          style={{ width: `${data.value}%` }}
                          aria-valuenow={data.value}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        />
                      </div>
                    </>
                  ) : data.title === 'AI Reviews' ? (
                    <div className="ai-review-content">
                      {aiReviewContent ? (
                        <div dangerouslySetInnerHTML={{ __html: aiReviewContent }} />
                      ) : (
                        <p className="m-b-0 text-muted">Upload a PDF to get AI Reviews.</p>
                      )}
                    </div>
                  ) : (
                    <div className="ai-recommendations-content">
                      <p className="m-b-0 text-muted">AI Recommendations will appear here.</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
      <Row>
        <Col xl={12} xxl={12} className="text-end">
          <Button variant="success" onClick={() => console.log('Generate New Contract File clicked')}>
            Generate New Contract File
          </Button>
        </Col>
      </Row>
    </React.Fragment>
  );
};

export default DashDefault;
