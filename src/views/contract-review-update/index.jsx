import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Spinner, Table, Badge, Alert } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

// Simplify API base
const SIMPLIFY_API_URL = 'https://workflow.simplifygenai.id/api/v1/prediction/c86edd85-f451-4bd6-8d7f-05a73c324c23';

// hit ke Contract Revision Agent - TRIAL
//const SIMPLIFY_API_URL = 'https://workflow.simplifygenai.id/api/v1/prediction/58c7ad94-1361-4556-a370-bdb965b25b15';



const ContractReviewUpdate = () => {
  const [contractData, setContractData] = useState(null);
  const [contractUpdates, setContractUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [revisedContract, setRevisedContract] = useState('');
  const [generatingContract, setGeneratingContract] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle direct access to the page without proper navigation state
  useEffect(() => {
    if (!location.state || !location.state.userEmail || !location.state.contractReviewId) {
      console.error('Direct access detected - missing navigation state');
      setError('This page requires proper navigation from the Contract Review page. Redirecting...');
      setLoading(false);
      setTimeout(() => {
        navigate('/contract-review');
      }, 2000);
    }
  }, [location.state, navigate]);

  useEffect(() => {
    const fetchContractData = async () => {
      try {
        setLoading(true);
        
        // Get data from location state (passed from contract-review)
        const { userEmail, contractReviewId } = location.state || {};
        
        // Validate that both userEmail and contractReviewId are present and valid
        if (!userEmail || !contractReviewId) {
          console.error('Missing required parameters:', { userEmail, contractReviewId });
          setError('Missing required parameters: userEmail or contractReviewId');
          setLoading(false);
          // Auto-redirect to /contract-review after a short delay
          setTimeout(() => {
            navigate('/contract-review');
          }, 2000);
          return;
        }

        // Additional validation for contract_review_id format (should be 50 characters)
        if (contractReviewId.length !== 50) {
          console.error('Invalid contract_review_id format:', contractReviewId);
          setError('Invalid contract_review_id format');
          setLoading(false);
          // Auto-redirect to /contract-review after a short delay
          setTimeout(() => {
            navigate('/contract-review');
          }, 2000);
          return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userEmail)) {
          console.error('Invalid email format:', userEmail);
          setError('Invalid email format');
          setLoading(false);
          // Auto-redirect to /contract-review after a short delay
          setTimeout(() => {
            navigate('/contract-review');
          }, 2000);
          return;
        }

        console.log('Successfully received parameters:', { userEmail, contractReviewId });

        // Fetch contract data from master_contract table
        const { data: contractData, error: contractError } = await supabase
          .from('master_contract')
          .select('*')
          .eq('user_email', userEmail)
          .eq('contract_review_id', contractReviewId);

        if (contractError) {
          console.error('Error fetching contract data:', contractError);
          setError('Error fetching contract data: ' + contractError.message);
          setLoading(false);
          // Auto-redirect to /contract-review after a short delay
          setTimeout(() => {
            navigate('/contract-review');
          }, 2000);
          return;
        }

        // Check if contract data exists
        if (!contractData || contractData.length === 0) {
          console.error('No contract data found for:', { userEmail, contractReviewId });
          setError('No contract data found for the provided parameters');
          setLoading(false);
          // Auto-redirect to /contract-review after a short delay
          setTimeout(() => {
            navigate('/contract-review');
          }, 2000);
          return;
        }

        // Fetch contract updates from contract_updates table
        const { data: updatesData, error: updatesError } = await supabase
          .from('contract_updates')
          .select('*')
          .eq('user_email', userEmail)
          .eq('contract_review_id', contractReviewId);

        if (updatesError) {
          console.error('Error fetching contract updates:', updatesError);
          setError('Error fetching contract updates: ' + updatesError.message);
          setLoading(false);
          // Auto-redirect to /contract-review after a short delay
          setTimeout(() => {
            navigate('/contract-review');
          }, 2000);
          return;
        }

        setContractData(contractData[0] || null);
        setContractUpdates(updatesData || []);
        
        console.log('Successfully fetched contract data:', contractData);
        console.log('Successfully fetched contract updates:', updatesData);
        
        // Log successful parameter posting and validation
        console.log('✅ SUCCESS: Parameters successfully posted and validated');
        console.log('✅ User Email:', userEmail);
        console.log('✅ Contract Review ID:', contractReviewId);
        console.log('✅ Data fetched successfully from database');
        
      } catch (error) {
        console.error('Error in fetchContractData:', error);
        setError('Error loading contract data: ' + error.message);
        setLoading(false);
        // Auto-redirect to /contract-review after a short delay
        setTimeout(() => {
          navigate('/contract-review');
        }, 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchContractData();
  }, [location.state, navigate]);

  const handleUpdateStatus = async (updateId, newStatus) => {
    try {
      setUpdating(true);
      
      const { error } = await supabase
        .from('contract_updates')
        .update({ status: newStatus })
        .eq('id', updateId);

      if (error) {
        console.error('Error updating status:', error);
        alert('Error updating status: ' + error.message);
        return;
      }

      // Refresh the data
      const { data: updatedData, error: fetchError } = await supabase
        .from('contract_updates')
        .select('*')
        .eq('user_email', contractData?.user_email)
        .eq('contract_review_id', contractData?.contract_review_id);

      if (fetchError) {
        console.error('Error refreshing data:', fetchError);
      } else {
        setContractUpdates(updatedData || []);
      }

      alert('Status updated successfully!');
    } catch (error) {
      console.error('Error in handleUpdateStatus:', error);
      alert('Error updating status: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge bg="success">{status}</Badge>;
      case 'pending':
        return <Badge bg="warning" text="dark">{status}</Badge>;
      case 'in_progress':
        return <Badge bg="info">{status}</Badge>;
      case 'rejected':
        return <Badge bg="danger">{status}</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const generateRevisedContract = async () => {
    if (!contractData?.contract_review_id) {
      alert('Contract Review ID is required to generate revised contract.');
      return;
    }

    setGeneratingContract(true);
    try {
      console.log('Starting revised contract generation for ID:', contractData.contract_review_id);

      // 1. Fetch original contract text from master_contract table
      const { data: originalContract, error: originalError } = await supabase
        .from('master_contract')
        .select('original_pdf_text, contract_name')
        .eq('contract_review_id', contractData.contract_review_id)
        .eq('status', 'pending') // Get the original contract, not the generated one
        .single();

      if (originalError || !originalContract) {
        console.error('Error fetching original contract:', originalError);
        alert('Failed to fetch original contract data.');
        setGeneratingContract(false);
        return;
      }

      // 2. Fetch contract updates from contract_updates table
      const { data: updates, error: updatesError } = await supabase
        .from('contract_updates')
        .select('recommended_legal_amendment, original_clause, contractual_reference')
        .eq('contract_review_id', contractData.contract_review_id);

      if (updatesError) {
        console.error('Error fetching contract updates:', updatesError);
        alert('Failed to fetch contract updates.');
        setGeneratingContract(false);
        return;
      }

      if (!updates || updates.length === 0) {
        alert('No contract updates found. Please add some updates before generating revised contract.');
        setGeneratingContract(false);
        return;
      }

      console.log('Original contract text length:', originalContract.original_pdf_text?.length);
      console.log('Number of updates found:', updates.length);

      // 3. Format the update prompt
      const updatesText = updates.map((update, i) => {
        return `Update ${i + 1}:
- Contractual Reference: ${update.contractual_reference || 'N/A'}
- Original Clause: ${update.original_clause || 'N/A'}
- Recommended Legal Amendment: ${update.recommended_legal_amendment || 'N/A'}
`;
      }).join('\n');

      const prompt = `
Here is the original employment contract:

${originalContract.original_pdf_text}

Below are the contract updates to apply:

${updatesText}

Please generate the full revised contract after applying these updates. Keep the structure, legal formatting, and numbering. Make sure to incorporate all the recommended legal amendments into the appropriate sections of the contract.
`;

      console.log('Sending request to Simplify API...');

      // 4. Send to Simplify Agent
      const response = await fetch(SIMPLIFY_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: prompt,
          chatId: contractData.contract_review_id,
          uploads: []
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const output = result.text || result.output || '[No response from Simplify]';
      
      console.log('Simplify response received:', output.substring(0, 200) + '...');
      
      setRevisedContract(output);

      // 5. Save the revised contract to database
      const { error: saveError } = await supabase
        .from('master_contract')
        .update({ 
          revised_contract_text: output,
          updated_at: new Date().toISOString()
        })
        .eq('contract_review_id', contractData.contract_review_id)
        .eq('status', 'pending'); // Update the original contract record

      if (saveError) {
        console.error('Error saving revised contract:', saveError);
        alert('Revised contract generated successfully, but failed to save to database.');
      } else {
        console.log('Revised contract saved to database successfully');
        alert('Revised contract generated and saved successfully!');
      }

    } catch (error) {
      console.error('Error generating revised contract:', error);
      alert('Error generating revised contract: ' + error.message);
    } finally {
      setGeneratingContract(false);
    }
  };

  const exportToWord = async () => {
    if (!revisedContract) {
      alert('No revised contract available to export. Please generate a revised contract first.');
      return;
    }

    try {
      // Convert markdown to Word document structure
      const paragraphs = [];
      
      // Split the content by lines and process each line
      const lines = revisedContract.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
          // Empty line - add spacing
          paragraphs.push(new Paragraph({}));
        } else if (trimmedLine.startsWith('# ')) {
          // Main heading
          paragraphs.push(
            new Paragraph({
              text: trimmedLine.substring(2),
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            })
          );
        } else if (trimmedLine.startsWith('## ')) {
          // Sub heading
          paragraphs.push(
            new Paragraph({
              text: trimmedLine.substring(3),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 150 }
            })
          );
        } else if (trimmedLine.startsWith('### ')) {
          // Sub sub heading
          paragraphs.push(
            new Paragraph({
              text: trimmedLine.substring(4),
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100 }
            })
          );
        } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          // Bullet point
          paragraphs.push(
            new Paragraph({
              text: trimmedLine.substring(2),
              bullet: { level: 0 },
              spacing: { before: 100, after: 100 }
            })
          );
        } else if (trimmedLine.startsWith('  - ') || trimmedLine.startsWith('  * ')) {
          // Nested bullet point
          paragraphs.push(
            new Paragraph({
              text: trimmedLine.substring(4),
              bullet: { level: 1 },
              spacing: { before: 100, after: 100 }
            })
          );
        } else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
          // Bold text
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: trimmedLine.substring(2, trimmedLine.length - 2),
                  bold: true
                })
              ],
              spacing: { before: 100, after: 100 }
            })
          );
        } else {
          // Regular paragraph
          paragraphs.push(
            new Paragraph({
              text: trimmedLine,
              spacing: { before: 100, after: 100 }
            })
          );
        }
      }

      // Create the document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: `Revised Contract - ${contractData?.contract_name || 'Contract'}`,
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 400 }
              }),
              new Paragraph({
                text: `Generated on: ${new Date().toLocaleString()}`,
                spacing: { before: 200, after: 400 }
              }),
              ...paragraphs
            ]
          }
        ]
      });

      // Generate and download the document
      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `revised_contract_${contractData?.contract_review_id || 'contract'}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert('Contract exported to Word document successfully!');
    } catch (error) {
      console.error('Error exporting to Word:', error);
      alert('Error exporting to Word: ' + error.message);
    }
  };

  if (loading) {
    return (
      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Body className="text-center">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
              <p className="mt-2">Loading contract review data...</p>
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
          <Alert variant="danger">
            <Alert.Heading>❌ Error - Redirecting to Contract Review</Alert.Heading>
            <p>{error}</p>
            <hr />
            <p><strong>Received Parameters:</strong></p>
            <ul>
              <li><strong>User Email:</strong> {location.state?.userEmail || 'NOT PROVIDED'}</li>
              <li><strong>Contract Review ID:</strong> {location.state?.contractReviewId || 'NOT PROVIDED'}</li>
            </ul>
            <p><strong>Validation Results:</strong></p>
            <ul>
              <li>User Email Valid: {location.state?.userEmail ? '✅' : '❌'}</li>
              <li>Contract Review ID Valid: {location.state?.contractReviewId ? '✅' : '❌'}</li>
              <li>Email Format Valid: {location.state?.userEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(location.state.userEmail) ? '✅' : '❌'}</li>
              <li>Contract Review ID Length Valid: {location.state?.contractReviewId && location.state.contractReviewId.length === 50 ? '✅' : '❌'}</li>
            </ul>
            <p className="mb-0">
              <small className="text-muted">
                You will be automatically redirected to the Contract Review page in 2 seconds...
              </small>
            </p>
          </Alert>
        </Col>
      </Row>
    );
  }

  return (
    <React.Fragment>
      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Header>
              <Card.Title as="h5">Contract Review Update</Card.Title>
            </Card.Header>
            <Card.Body>
              {contractData && (
                <div className="mb-4">
                  <h6>Contract Information</h6>
                  <p><strong>Contract Name:</strong> {contractData.contract_name}</p>
                  <p><strong>Review ID:</strong> {contractData.contract_review_id}</p>
                  <p><strong>User Email:</strong> {contractData.user_email}</p>
                  <p><strong>Status:</strong> {getStatusBadge(contractData.status)}</p>
                  <p><strong>Created:</strong> {new Date(contractData.created_at).toLocaleString()}</p>
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
              <Card.Title as="h5">Successfully Posted Parameters</Card.Title>
            </Card.Header>
            <Card.Body>
              <Alert variant="success">
                <Alert.Heading>✅ Parameters Successfully Posted</Alert.Heading>
                <p>The following parameters were successfully received and validated:</p>
                <hr />
                <p><strong>User Email:</strong> {contractData?.user_email || 'N/A'}</p>
                <p><strong>Contract Review ID:</strong> {contractData?.contract_review_id || 'N/A'}</p>
                <p className="mb-0">
                  <small className="text-muted">
                    These parameters were successfully posted from the contract review page and validated.
                  </small>
                </p>
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Header>
              <Card.Title as="h5">Contract Updates</Card.Title>
            </Card.Header>
            <Card.Body>
              {contractUpdates.length > 0 ? (
                <Table responsive>
                  <thead>
                    <tr>
                      <th>Contractual Reference</th>
                      <th>Recommended Legal Amendment</th>
                      <th>Original Clause</th>
                      <th>Input Verification</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractUpdates.map((update) => (
                      <tr key={update.id}>
                        <td>{update.contractual_reference}</td>
                        <td>{update.recommended_legal_amendment}</td>
                        <td>{update.original_clause}</td>
                        <td>{update.input_verification_of_amendments}</td>
                        <td>{getStatusBadge(update.status)}</td>
                        <td>
                          <Form.Select
                            size="sm"
                            value={update.status}
                            onChange={(e) => handleUpdateStatus(update.id, e.target.value)}
                            disabled={updating}
                            style={{ width: 'auto' }}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="rejected">Rejected</option>
                          </Form.Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-muted">No contract updates found for this review session.</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={12} xxl={12}>
          <Card>
            <Card.Header>
              <Card.Title as="h5">Generate Revised Contract</Card.Title>
            </Card.Header>
            <Card.Body>
              <p className="text-muted mb-3">
                Generate a new revised contract based on the original contract and the recommended legal amendments.
              </p>
              <Button 
                variant="primary" 
                size="lg"
                onClick={generateRevisedContract}
                disabled={generatingContract || contractUpdates.length === 0}
                style={{ marginBottom: '20px' }}
              >
                {generatingContract ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Generating Revised Contract...
                  </>
                ) : (
                  'Generate Revised Contract'
                )}
              </Button>
              
              {contractUpdates.length === 0 && (
                <Alert variant="warning">
                  <Alert.Heading>No Contract Updates Available</Alert.Heading>
                  <p>
                    You need to have contract updates before generating a revised contract. 
                    Please ensure you have completed the contract review process with recommended amendments.
                  </p>
                </Alert>
              )}

              {revisedContract && (
                <div className="mt-4">
                  <h6>Generated Revised Contract:</h6>
                  <div 
                    className="border p-3 bg-light" 
                    style={{ 
                      maxHeight: '400px', 
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}
                  >
                    {revisedContract}
                  </div>
                  <div className="mt-3">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => {
                        const blob = new Blob([revisedContract], { type: 'text/plain' });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `revised_contract_${contractData?.contract_review_id}.txt`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      }}
                      style={{ marginRight: '10px' }}
                    >
                      Download Revised Contract
                    </Button>
                    <Button 
                      variant="outline-success" 
                      size="sm"
                      onClick={exportToWord}
                    >
                      Export to WORD
                    </Button>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col xl={12} xxl={12} className="text-start">
          <Button 
            variant="secondary" 
            onClick={() => navigate('/contract-review')}
            style={{ marginTop: '20px' }}
          >
            Back to Contract Review
          </Button>
        </Col>
      </Row>
    </React.Fragment>
  );
};

export default ContractReviewUpdate; 