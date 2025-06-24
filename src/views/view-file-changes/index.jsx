import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Row, Col, Card, Alert, Button, Spinner } from 'react-bootstrap';
import { supabase } from '../../config/supabase';
import DiffViewer from 'react-diff-viewer';

const ViewFileChanges = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const contractReviewId = location.state?.contractReviewId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [originalText, setOriginalText] = useState('');
  const [revisedText, setRevisedText] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [updatesText, setUpdatesText] = useState('');

  useEffect(() => {
    const fetchContractTexts = async () => {
      if (!contractReviewId) {
        setError('No Review ID provided. Please access this page from the File Updates screen.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('master_contract')
          .select('original_pdf_text, revised_contract_plain_text, review_date, updates_text')
          .eq('contract_review_id', contractReviewId)
          .single();
        if (fetchError) {
          setError('Error fetching contract data: ' + fetchError.message);
        } else if (!data) {
          setError('No contract found for the provided Review ID.');
        } else {
          setOriginalText(data.original_pdf_text || '');
          setRevisedText(data.revised_contract_plain_text || '');
          setReviewDate(data.review_date || '');
          setUpdatesText(data.updates_text || '');
        }
      } catch (err) {
        setError('Unexpected error: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchContractTexts();
  }, [contractReviewId]);

  if (!contractReviewId) {
    return (
      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Body>
              <Alert variant="danger">
                <Alert.Heading>Error</Alert.Heading>
                <p>No Review ID provided. Please access this page from the File Updates screen.</p>
                <Button variant="primary" onClick={() => navigate('/update-tracking')}>Back to File Updates</Button>
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  }

  if (loading) {
    return (
      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Body className="text-center">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-2">Loading contract texts...</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  }

  if (error) {
    return (
      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Body>
              <Alert variant="danger">
                <Alert.Heading>Error</Alert.Heading>
                <p>{error}</p>
                <Button variant="primary" onClick={() => navigate('/update-tracking')}>Back to File Updates</Button>
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  }

  return (
    <>
      <Row>
        <Col xl={12} xxl={12}>
          <Card className="mb-4">
            <Card.Header>
              <Card.Title as="h5">Update Summary</Card.Title>
            </Card.Header>
            <Card.Body>
              <p><strong>Review ID:</strong> <code>{contractReviewId}</code></p>
              {reviewDate && (
                <p><strong>Update Time:</strong> <span>{new Date(reviewDate).toLocaleString()}</span></p>
              )}
              {updatesText && (
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>Changes:</strong>
                  <pre style={{ background: '#f8f9fa', color: '#212529', borderRadius: '4px', padding: '0.5rem', marginBottom: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{updatesText}</pre>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Header>
              <Card.Title as="h5">File Changes</Card.Title>
            </Card.Header>
            <Card.Body>
              <DiffViewer
                oldValue={originalText}
                newValue={revisedText}
                splitView={true}
                leftTitle="Original Contract"
                rightTitle="Revised Contract"
                showDiffOnly={false}
                styles={{ diffContainer: { minHeight: '400px' } }}
              />
              <Button variant="secondary" className="mt-3" onClick={() => navigate('/update-tracking')}>Back to File Updates</Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default ViewFileChanges; 